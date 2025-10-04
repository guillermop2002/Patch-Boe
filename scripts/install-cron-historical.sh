#!/bin/bash
# scripts/install-cron-historical.sh
# Script para instalar/desinstalar el cron job histórico del análisis del BOE

set -e

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

PROJECT_DIR="$HOME/patch_boe"
CRON_SCRIPT="$PROJECT_DIR/scripts/cron-historical-boe.sh"
CRON_TIME="0 14 * * *"  # Todos los días a las 14:00
CRON_COMMENT="# Análisis automático histórico del BOE (DESACTIVADO - activar cuando esté listo)"
PROGRESS_FILE="$PROJECT_DIR/data/historical-progress.txt"
START_DATE="20251003"

# ============================================================================
# FUNCIONES
# ============================================================================

show_usage() {
    echo "Uso: $0 [install|uninstall|status|enable|disable|reset]"
    echo ""
    echo "Comandos:"
    echo "  install   - Instalar el cron job histórico (DESACTIVADO por defecto)"
    echo "  uninstall - Desinstalar el cron job histórico"
    echo "  status    - Mostrar estado del cron job histórico"
    echo "  enable    - Activar el cron job histórico (descomentar)"
    echo "  disable   - Desactivar el cron job histórico (comentar)"
    echo "  reset     - Resetear progreso histórico (volver a fecha inicial)"
    echo ""
}

install_cron() {
    echo "📦 Instalando cron job histórico..."
    
    # Verificar que el script existe
    if [ ! -f "$CRON_SCRIPT" ]; then
        echo "❌ Error: No se encuentra el script $CRON_SCRIPT"
        exit 1
    fi
    
    # Dar permisos de ejecución
    chmod +x "$CRON_SCRIPT"
    echo "✅ Permisos de ejecución otorgados a $CRON_SCRIPT"
    
    # Verificar si ya existe el cron job
    if crontab -l 2>/dev/null | grep -q "cron-historical-boe.sh"; then
        echo "⚠️  El cron job histórico ya existe. Use 'uninstall' primero si desea reinstalar."
        exit 1
    fi
    
    # Crear directorio de datos si no existe
    mkdir -p "$PROJECT_DIR/data"
    
    # Crear archivo de progreso inicial si no existe
    if [ ! -f "$PROGRESS_FILE" ]; then
        echo "$START_DATE" > "$PROGRESS_FILE"
        echo "✅ Archivo de progreso creado: $PROGRESS_FILE"
    fi
    
    # Crear entrada de cron COMENTADA (desactivada)
    (crontab -l 2>/dev/null || true; echo "$CRON_COMMENT"; echo "# $CRON_TIME $CRON_SCRIPT >> $PROJECT_DIR/logs/cron-historical/cron-output.log 2>&1") | crontab -
    
    echo "✅ Cron job histórico instalado (DESACTIVADO)"
    echo ""
    echo "📋 Configuración:"
    echo "   Horario: Todos los días a las 14:00"
    echo "   Script: $CRON_SCRIPT"
    echo "   Estado: DESACTIVADO (comentado con #)"
    echo "   Fecha inicial: $START_DATE"
    echo "   Archivo de progreso: $PROGRESS_FILE"
    echo ""
    echo "⚠️  IMPORTANTE: El cron job histórico está DESACTIVADO por defecto."
    echo "   Para activarlo, ejecute: $0 enable"
    echo ""
}

uninstall_cron() {
    echo "🗑️  Desinstalando cron job histórico..."
    
    # Eliminar todas las líneas relacionadas con cron-historical-boe.sh
    crontab -l 2>/dev/null | grep -v "cron-historical-boe.sh" | grep -v "Análisis automático histórico del BOE" | crontab - || true
    
    echo "✅ Cron job histórico desinstalado"
    echo ""
    echo "ℹ️  El archivo de progreso ($PROGRESS_FILE) se mantiene para preservar el estado."
    echo "   Si desea resetear el progreso, use: $0 reset"
}

show_status() {
    echo "📊 Estado del cron job histórico:"
    echo ""
    
    if crontab -l 2>/dev/null | grep -q "cron-historical-boe.sh"; then
        echo "✅ Cron job histórico instalado"
        echo ""
        echo "Configuración actual:"
        crontab -l 2>/dev/null | grep -A1 "Análisis automático histórico del BOE" || true
        echo ""
        
        if crontab -l 2>/dev/null | grep "cron-historical-boe.sh" | grep -q "^#"; then
            echo "⏸️  Estado: DESACTIVADO (comentado)"
        else
            echo "▶️  Estado: ACTIVADO"
        fi
        
        # Mostrar información del progreso
        if [ -f "$PROGRESS_FILE" ]; then
            local last_date=$(cat "$PROGRESS_FILE")
            echo ""
            echo "📈 Progreso histórico:"
            echo "   Fecha inicial: $START_DATE"
            echo "   Última fecha procesada: $last_date"
            
            # Calcular días procesados
            local dias_procesados=0
            local fecha_temp="$START_DATE"
            
            while [ "$fecha_temp" != "$last_date" ]; do
                dias_procesados=$((dias_procesados + 1))
                fecha_temp=$(date -d "$fecha_temp -1 day" +%Y%m%d 2>/dev/null || echo "error")
                if [ "$fecha_temp" = "error" ]; then
                    break
                fi
                if [ $dias_procesados -gt 1000 ]; then
                    break
                fi
            done
            
            echo "   Días procesados: $dias_procesados"
        else
            echo ""
            echo "⚠️  Archivo de progreso no encontrado: $PROGRESS_FILE"
        fi
    else
        echo "❌ Cron job histórico NO instalado"
        echo "   Ejecute '$0 install' para instalarlo"
    fi
    echo ""
}

enable_cron() {
    echo "▶️  Activando cron job histórico..."
    
    if ! crontab -l 2>/dev/null | grep -q "cron-historical-boe.sh"; then
        echo "❌ Error: El cron job histórico no está instalado. Ejecute '$0 install' primero."
        exit 1
    fi
    
    # Descomentar la línea del cron job
    crontab -l 2>/dev/null | sed "s|^# \($CRON_TIME.*cron-historical-boe.sh.*\)|\1|" | crontab -
    
    # Actualizar el comentario
    crontab -l 2>/dev/null | sed "s|# Análisis automático histórico del BOE (DESACTIVADO.*|# Análisis automático histórico del BOE (ACTIVADO)|" | crontab -
    
    echo "✅ Cron job histórico ACTIVADO"
    echo ""
    echo "⚠️  El análisis histórico se ejecutará automáticamente todos los días a las 14:00"
    echo "   Procesará datos hacia atrás desde la fecha: $(cat "$PROGRESS_FILE" 2>/dev/null || echo "$START_DATE")"
    echo ""
}

disable_cron() {
    echo "⏸️  Desactivando cron job histórico..."
    
    if ! crontab -l 2>/dev/null | grep -q "cron-historical-boe.sh"; then
        echo "❌ Error: El cron job histórico no está instalado."
        exit 1
    fi
    
    # Comentar la línea del cron job
    crontab -l 2>/dev/null | sed "s|^\($CRON_TIME.*cron-historical-boe.sh.*\)|# \1|" | crontab -
    
    # Actualizar el comentario
    crontab -l 2>/dev/null | sed "s|# Análisis automático histórico del BOE (ACTIVADO.*|# Análisis automático histórico del BOE (DESACTIVADO - activar cuando esté listo)|" | crontab -
    
    echo "✅ Cron job histórico DESACTIVADO"
    echo ""
}

reset_progress() {
    echo "🔄 Reseteando progreso histórico..."
    
    if [ -f "$PROGRESS_FILE" ]; then
        local current_date=$(cat "$PROGRESS_FILE")
        echo "   Fecha actual: $current_date"
        echo "   Fecha inicial: $START_DATE"
        echo ""
        read -p "¿Está seguro de que desea resetear el progreso? (s/N): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            echo "$START_DATE" > "$PROGRESS_FILE"
            echo "✅ Progreso reseteado a fecha inicial: $START_DATE"
        else
            echo "⏭️  Reset cancelado"
        fi
    else
        echo "$START_DATE" > "$PROGRESS_FILE"
        echo "✅ Archivo de progreso creado con fecha inicial: $START_DATE"
    fi
    echo ""
}

# ============================================================================
# MAIN
# ============================================================================

case "${1:-}" in
    install)
        install_cron
        ;;
    uninstall)
        uninstall_cron
        ;;
    status)
        show_status
        ;;
    enable)
        enable_cron
        ;;
    disable)
        disable_cron
        ;;
    reset)
        reset_progress
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
