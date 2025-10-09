#!/bin/bash
# scripts/test-cron.sh
# Script para probar el cron job manualmente con una fecha específica

set -e

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

PROJECT_DIR="$HOME/patch_boe"
LOG_DIR="$PROJECT_DIR/logs/cron"
CRON_SCRIPT="$PROJECT_DIR/scripts/cron-daily-boe.sh"

# ============================================================================
# FUNCIONES
# ============================================================================

show_usage() {
    echo "Uso: $0 [FECHA]"
    echo ""
    echo "Ejecuta una prueba manual del cron job con una fecha específica."
    echo ""
    echo "Argumentos:"
    echo "  FECHA    Fecha en formato YYYYMMDD (opcional)"
    echo "           Si no se especifica, usa el día anterior (D-1)"
    echo ""
    echo "Ejemplos:"
    echo "  $0                # Prueba con el día anterior"
    echo "  $0 20250929       # Prueba con fecha específica"
    echo ""
}

calculate_previous_day() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        date -v-1d +%Y%m%d
    else
        date -d "yesterday" +%Y%m%d
    fi
}

cleanup_test_data() {
    local fecha=$1
    
    echo ""
    echo "🧹 Limpiando datos de prueba para la fecha $fecha..."
    echo "   Esto eliminará:"
    echo "   - XMLs en data/xml/$fecha/"
    echo "   - JSONs en data/json/$fecha/"
    echo "   - Registros de BD para fecha $fecha"
    echo ""
    
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
}

run_test() {
    local fecha=$1
    
    echo "=========================================="
    echo "PRUEBA MANUAL DEL CRON JOB"
    echo "=========================================="
    echo "Fecha a probar: $fecha"
    echo "Script: $CRON_SCRIPT"
    echo "Logs: $LOG_DIR/"
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
    
    echo "▶️  Ejecutando prueba..."
    echo ""
    
    # Ejecutar el script (modificando temporalmente para usar la fecha especificada)
    # Creamos un script temporal que sobrescribe la función calculate_previous_day
    cat > /tmp/test-cron-wrapper.sh << EOF
#!/bin/bash
source "$CRON_SCRIPT"

# Sobrescribir la función calculate_previous_day
calculate_previous_day() {
    echo "$fecha"
}

# Ejecutar main
main
EOF
    
    chmod +x /tmp/test-cron-wrapper.sh
    
    if /tmp/test-cron-wrapper.sh; then
        echo ""
        echo "=========================================="
        echo "✅ PRUEBA COMPLETADA EXITOSAMENTE"
        echo "=========================================="
        
        # Mostrar estadísticas
        echo ""
        echo "📊 Estadísticas:"
        
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
        echo "   $(ls -lh "$LOG_DIR/boe-analysis-$(date +%Y%m%d).log" 2>/dev/null || echo 'No disponible')"
        
        # Ofrecer limpieza
        cleanup_test_data "$fecha"
        
    else
        echo ""
        echo "=========================================="
        echo "❌ PRUEBA FINALIZADA CON ERRORES"
        echo "=========================================="
        echo ""
        echo "Revise el log para más detalles:"
        echo "   $LOG_DIR/boe-analysis-$(date +%Y%m%d).log"
        
        rm -f /tmp/test-cron-wrapper.sh
        exit 1
    fi
    
    rm -f /tmp/test-cron-wrapper.sh
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
    FECHA_PRUEBA=$(calculate_previous_day)
    echo "ℹ️  No se especificó fecha, usando día anterior: $FECHA_PRUEBA"
    echo ""
fi

run_test "$FECHA_PRUEBA"

