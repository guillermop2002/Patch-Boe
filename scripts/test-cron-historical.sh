#!/bin/bash
# scripts/test-cron-historical.sh
# Script para probar el cron job histórico manualmente con una fecha específica

set -e

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

PROJECT_DIR="$HOME/patch_boe"
LOG_DIR="$PROJECT_DIR/logs/cron-historical"
CRON_SCRIPT="$PROJECT_DIR/scripts/cron-historical-boe.sh"
PROGRESS_FILE="$PROJECT_DIR/data/historical-progress.txt"
START_DATE="20251003"

# ============================================================================
# FUNCIONES
# ============================================================================

show_usage() {
    echo "Uso: $0 [FECHA]"
    echo ""
    echo "Ejecuta una prueba manual del cron job histórico con una fecha específica."
    echo ""
    echo "Argumentos:"
    echo "  FECHA    Fecha en formato YYYYMMDD (opcional)"
    echo "           Si no se especifica, usa la fecha del progreso actual"
    echo ""
    echo "Ejemplos:"
    echo "  $0                # Prueba con fecha del progreso actual"
    echo "  $0 20251002       # Prueba con fecha específica"
    echo ""
}

get_current_progress_date() {
    if [ -f "$PROGRESS_FILE" ]; then
        cat "$PROGRESS_FILE"
    else
        echo "$START_DATE"
    fi
}

calculate_previous_date() {
    local fecha=$1
    
    # Convertir YYYYMMDD a formato para date
    local año=${fecha:0:4}
    local mes=${fecha:4:2}
    local dia=${fecha:6:2}
    
    # Calcular fecha anterior
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        date -j -v-1d -f "%Y-%m-%d" "$año-$mes-$dia" +%Y%m%d
    else
        # Linux
        date -d "$año-$mes-$dia -1 day" +%Y%m%d
    fi
}

cleanup_test_data() {
    local fecha=$1
    
    echo ""
    echo "🧹 ¿Desea limpiar los datos de prueba para la fecha $fecha?"
    echo "   Esto eliminará:"
    echo "   - XMLs en data/xml/$fecha/"
    echo "   - JSONs en data/json/$fecha/"
    echo "   - Registros de BD para fecha $fecha"
    echo ""
    read -p "¿Continuar? (s/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo "🧹 Limpiando datos de prueba..."
        
        # Eliminar XMLs
        if [ -d "$PROJECT_DIR/data/xml/$fecha" ]; then
            rm -rf "$PROJECT_DIR/data/xml/$fecha"
            echo "✅ XMLs eliminados"
        fi
        
        # Eliminar JSONs
        if [ -d "$PROJECT_DIR/data/json/$fecha" ]; then
            rm -rf "$PROJECT_DIR/data/json/$fecha"
            echo "✅ JSONs eliminados"
        fi
        
        # Eliminar registros de BD
        sudo docker exec patch-legislativo sqlite3 data/db/patches.db \
            "DELETE FROM patches WHERE fecha='$fecha';" 2>/dev/null || true
        echo "✅ Registros de BD eliminados"
        
        echo "✅ Limpieza completada"
    else
        echo "⏭️  Limpieza cancelada"
    fi
}

run_test() {
    local fecha=$1
    
    echo "=========================================="
    echo "PRUEBA MANUAL DEL CRON JOB HISTÓRICO"
    echo "=========================================="
    echo "Fecha a probar: $fecha"
    echo "Script: $CRON_SCRIPT"
    echo "Logs: $LOG_DIR/"
    echo "Progreso: $PROGRESS_FILE"
    echo "=========================================="
    echo ""
    
    # Verificar que el script existe
    if [ ! -f "$CRON_SCRIPT" ]; then
        echo "❌ Error: No se encuentra el script $CRON_SCRIPT"
        exit 1
    fi
    
    # Dar permisos de ejecución
    chmod +x "$CRON_SCRIPT"
    
    # Crear directorio de logs si no existe
    mkdir -p "$LOG_DIR"
    
    # Crear archivo de progreso temporal para la prueba
    local temp_progress="/tmp/historical-progress-test.txt"
    echo "$fecha" > "$temp_progress"
    
    echo "▶️  Ejecutando prueba histórica..."
    echo ""
    
    # Ejecutar el script (modificando temporalmente para usar la fecha especificada)
    # Creamos un script temporal que sobrescribe la función get_last_processed_date
    cat > /tmp/test-cron-historical-wrapper.sh << EOF
#!/bin/bash
source "$CRON_SCRIPT"

# Sobrescribir la función get_last_processed_date
get_last_processed_date() {
    echo "$fecha"
}

# Sobrescribir la función set_last_processed_date para no modificar el archivo real
set_last_processed_date() {
    local fecha=\$1
    echo "📝 [PRUEBA] Progreso actualizado: última fecha procesada = \$fecha"
}

# Ejecutar main
main
EOF
    
    chmod +x /tmp/test-cron-historical-wrapper.sh
    
    if /tmp/test-cron-historical-wrapper.sh; then
        echo ""
        echo "=========================================="
        echo "✅ PRUEBA HISTÓRICA COMPLETADA EXITOSAMENTE"
        echo "=========================================="
        
        # Mostrar estadísticas
        echo ""
        echo "📊 Estadísticas históricas:"
        
        local patch_count=$(sudo docker exec patch-legislativo sqlite3 data/db/patches.db \
            "SELECT COUNT(*) FROM patches WHERE fecha='$fecha';" 2>/dev/null || echo "0")
        
        local buff_count=$(sudo docker exec patch-legislativo sqlite3 data/db/patches.db \
            "SELECT COUNT(*) FROM patches WHERE fecha='$fecha' AND tipo='buff';" 2>/dev/null || echo "0")
        
        local nerf_count=$(sudo docker exec patch-legislativo sqlite3 data/db/patches.db \
            "SELECT COUNT(*) FROM patches WHERE fecha='$fecha' AND tipo='nerf';" 2>/dev/null || echo "0")
        
        echo "   Total patches: $patch_count"
        echo "   BUFFs: $buff_count"
        echo "   NERFs: $nerf_count"
        
        # Verificar archivos
        local xml_count=$(ls "$PROJECT_DIR/data/xml/$fecha/" 2>/dev/null | wc -l || echo "0")
        local json_count=$(ls "$PROJECT_DIR/data/json/$fecha/" 2>/dev/null | wc -l || echo "0")
        
        echo "   XMLs descargados: $xml_count"
        echo "   JSONs generados: $json_count"
        
        echo ""
        echo "📋 Log de la ejecución:"
        echo "   $(ls -lh "$LOG_DIR/boe-historical-$(date +%Y%m%d).log" 2>/dev/null || echo 'No disponible')"
        
        # Mostrar progreso actual
        local current_progress=$(get_current_progress_date)
        echo ""
        echo "📈 Progreso actual del sistema:"
        echo "   Fecha inicial: $START_DATE"
        echo "   Última fecha procesada: $current_progress"
        
        # Ofrecer limpieza
        cleanup_test_data "$fecha"
        
    else
        echo ""
        echo "=========================================="
        echo "❌ PRUEBA HISTÓRICA FINALIZADA CON ERRORES"
        echo "=========================================="
        echo ""
        echo "Revise el log para más detalles:"
        echo "   $LOG_DIR/boe-historical-$(date +%Y%m%d).log"
        
        rm -f /tmp/test-cron-historical-wrapper.sh
        rm -f "$temp_progress"
        exit 1
    fi
    
    rm -f /tmp/test-cron-historical-wrapper.sh
    rm -f "$temp_progress"
}

# ============================================================================
# MAIN
# ============================================================================

if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_usage
    exit 0
fi

# Determinar fecha a probar
if [ -n "$1" ]; then
    # Validar formato YYYYMMDD
    if [[ ! "$1" =~ ^[0-9]{8}$ ]]; then
        echo "❌ Error: Formato de fecha inválido. Use YYYYMMDD"
        echo ""
        show_usage
        exit 1
    fi
    FECHA_PRUEBA="$1"
else
    FECHA_PRUEBA=$(get_current_progress_date)
    echo "ℹ️  No se especificó fecha, usando fecha del progreso actual: $FECHA_PRUEBA"
    echo ""
fi

run_test "$FECHA_PRUEBA"
