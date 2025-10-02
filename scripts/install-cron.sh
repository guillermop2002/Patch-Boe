#!/bin/bash
# scripts/install-cron.sh
# Script para instalar/desinstalar el cron job del análisis diario del BOE

set -e

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

PROJECT_DIR="$HOME/patch_boe"
CRON_SCRIPT="$PROJECT_DIR/scripts/cron-daily-boe.sh"
CRON_TIME="0 13 * * *"  # Todos los días a las 13:00
CRON_COMMENT="# Análisis automático diario del BOE (DESACTIVADO - activar cuando esté listo)"

# ============================================================================
# FUNCIONES
# ============================================================================

show_usage() {
    echo "Uso: $0 [install|uninstall|status|enable|disable]"
    echo ""
    echo "Comandos:"
    echo "  install   - Instalar el cron job (DESACTIVADO por defecto)"
    echo "  uninstall - Desinstalar el cron job"
    echo "  status    - Mostrar estado del cron job"
    echo "  enable    - Activar el cron job (descomentar)"
    echo "  disable   - Desactivar el cron job (comentar)"
    echo ""
}

install_cron() {
    echo "📦 Instalando cron job..."
    
    # Verificar que el script existe
    if [ ! -f "$CRON_SCRIPT" ]; then
        echo "❌ Error: No se encuentra el script $CRON_SCRIPT"
        exit 1
    fi
    
    # Dar permisos de ejecución
    chmod +x "$CRON_SCRIPT"
    echo "✅ Permisos de ejecución otorgados a $CRON_SCRIPT"
    
    # Verificar si ya existe el cron job
    if crontab -l 2>/dev/null | grep -q "cron-daily-boe.sh"; then
        echo "⚠️  El cron job ya existe. Use 'uninstall' primero si desea reinstalar."
        exit 1
    fi
    
    # Crear entrada de cron COMENTADA (desactivada)
    (crontab -l 2>/dev/null || true; echo "$CRON_COMMENT"; echo "# $CRON_TIME $CRON_SCRIPT >> $PROJECT_DIR/logs/cron/cron-output.log 2>&1") | crontab -
    
    echo "✅ Cron job instalado (DESACTIVADO)"
    echo ""
    echo "📋 Configuración:"
    echo "   Horario: Todos los días a las 13:00"
    echo "   Script: $CRON_SCRIPT"
    echo "   Estado: DESACTIVADO (comentado con #)"
    echo ""
    echo "⚠️  IMPORTANTE: El cron job está DESACTIVADO por defecto."
    echo "   Para activarlo, ejecute: $0 enable"
    echo ""
}

uninstall_cron() {
    echo "🗑️  Desinstalando cron job..."
    
    # Eliminar todas las líneas relacionadas con cron-daily-boe.sh
    crontab -l 2>/dev/null | grep -v "cron-daily-boe.sh" | grep -v "Análisis automático diario del BOE" | crontab - || true
    
    echo "✅ Cron job desinstalado"
}

show_status() {
    echo "📊 Estado del cron job:"
    echo ""
    
    if crontab -l 2>/dev/null | grep -q "cron-daily-boe.sh"; then
        echo "✅ Cron job instalado"
        echo ""
        echo "Configuración actual:"
        crontab -l 2>/dev/null | grep -A1 "Análisis automático diario del BOE" || true
        echo ""
        
        if crontab -l 2>/dev/null | grep "cron-daily-boe.sh" | grep -q "^#"; then
            echo "⏸️  Estado: DESACTIVADO (comentado)"
        else
            echo "▶️  Estado: ACTIVADO"
        fi
    else
        echo "❌ Cron job NO instalado"
        echo "   Ejecute '$0 install' para instalarlo"
    fi
    echo ""
}

enable_cron() {
    echo "▶️  Activando cron job..."
    
    if ! crontab -l 2>/dev/null | grep -q "cron-daily-boe.sh"; then
        echo "❌ Error: El cron job no está instalado. Ejecute '$0 install' primero."
        exit 1
    fi
    
    # Descomentar la línea del cron job
    crontab -l 2>/dev/null | sed "s|^# \($CRON_TIME.*cron-daily-boe.sh.*\)|\1|" | crontab -
    
    # Actualizar el comentario
    crontab -l 2>/dev/null | sed "s|# Análisis automático diario del BOE (DESACTIVADO.*|# Análisis automático diario del BOE (ACTIVADO)|" | crontab -
    
    echo "✅ Cron job ACTIVADO"
    echo ""
    echo "⚠️  El análisis se ejecutará automáticamente todos los días a las 13:00"
    echo ""
}

disable_cron() {
    echo "⏸️  Desactivando cron job..."
    
    if ! crontab -l 2>/dev/null | grep -q "cron-daily-boe.sh"; then
        echo "❌ Error: El cron job no está instalado."
        exit 1
    fi
    
    # Comentar la línea del cron job
    crontab -l 2>/dev/null | sed "s|^\($CRON_TIME.*cron-daily-boe.sh.*\)|# \1|" | crontab -
    
    # Actualizar el comentario
    crontab -l 2>/dev/null | sed "s|# Análisis automático diario del BOE (ACTIVADO.*|# Análisis automático diario del BOE (DESACTIVADO - activar cuando esté listo)|" | crontab -
    
    echo "✅ Cron job DESACTIVADO"
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
    *)
        show_usage
        exit 1
        ;;
esac

