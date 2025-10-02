#!/bin/bash
# scripts/cron-daily-boe.sh
# Script de cron para análisis automático diario del BOE
# Ejecuta todos los días a las 13:00, analiza el día anterior (D-1)

set -e  # Salir si hay errores

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

# Directorio base del proyecto
PROJECT_DIR="$HOME/patch_boe"
LOG_DIR="$PROJECT_DIR/logs/cron"
LOG_RETENTION_DAYS=30

# Crear directorio de logs si no existe
mkdir -p "$LOG_DIR"

# Archivo de log con fecha
LOG_FILE="$LOG_DIR/boe-analysis-$(date +%Y%m%d).log"

# ============================================================================
# FUNCIONES DE LOGGING
# ============================================================================

log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $1" | tee -a "$LOG_FILE"
}

# ============================================================================
# FUNCIÓN DE LIMPIEZA DE LOGS ANTIGUOS
# ============================================================================

cleanup_old_logs() {
    log_info "Limpiando logs antiguos (más de $LOG_RETENTION_DAYS días)..."
    find "$LOG_DIR" -name "boe-analysis-*.log" -type f -mtime +$LOG_RETENTION_DAYS -delete 2>/dev/null || true
    log_info "Limpieza de logs completada"
}

# ============================================================================
# CALCULAR FECHA DEL DÍA ANTERIOR (D-1)
# ============================================================================

calculate_previous_day() {
    # Calcular fecha del día anterior en formato YYYYMMDD
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        date -v-1d +%Y%m%d
    else
        # Linux
        date -d "yesterday" +%Y%m%d
    fi
}

# ============================================================================
# VERIFICAR DISPONIBILIDAD EN LA API DEL BOE
# ============================================================================

check_boe_availability() {
    local fecha=$1
    local api_url="https://www.boe.es/datosabiertos/api/boe/sumario/$fecha"

    log_info "Verificando disponibilidad del BOE para fecha: $fecha"
    log_info "URL: $api_url"

    # Hacer petición GET y capturar código de respuesta (con header Accept)
    local http_code=$(curl -s -H "Accept: application/xml" -o /tmp/boe_response.xml -w "%{http_code}" "$api_url")
    
    log_info "Código HTTP recibido: $http_code"
    
    if [ "$http_code" = "404" ]; then
        # Verificar si es el XML de error esperado
        if grep -q "<code>404</code>" /tmp/boe_response.xml 2>/dev/null; then
            log_warning "No hay datos disponibles para la fecha $fecha (404)"
            log_warning "Respuesta del BOE: La información solicitada no existe"
            rm -f /tmp/boe_response.xml
            return 1
        fi
    elif [ "$http_code" = "200" ]; then
        # Verificar que sea un XML válido con datos
        if grep -q "<code>200</code>" /tmp/boe_response.xml 2>/dev/null && \
           grep -q "<sumario>" /tmp/boe_response.xml 2>/dev/null; then
            log_success "Datos disponibles para la fecha $fecha (200 OK)"
            rm -f /tmp/boe_response.xml
            return 0
        else
            log_error "Respuesta 200 pero XML inválido o sin datos"
            rm -f /tmp/boe_response.xml
            return 1
        fi
    else
        log_error "Código HTTP inesperado: $http_code"
        rm -f /tmp/boe_response.xml
        return 1
    fi
}

# ============================================================================
# EJECUTAR ANÁLISIS DEL BOE
# ============================================================================

run_boe_analysis() {
    local fecha=$1
    
    log_info "=========================================="
    log_info "Iniciando análisis del BOE para fecha: $fecha"
    log_info "=========================================="
    
    cd "$PROJECT_DIR"
    
    # Ejecutar el script de descarga y clasificación dentro del contenedor Docker
    log_info "Ejecutando descarga y clasificación..."
    
    if sudo docker exec patch-legislativo node scripts/fetch-boe.cjs "$fecha" >> "$LOG_FILE" 2>&1; then
        log_success "Análisis completado exitosamente para fecha: $fecha"
        
        # Verificar cuántos patches se guardaron
        local patch_count=$(sudo docker exec patch-legislativo sqlite3 data/db/patches.db \
            "SELECT COUNT(*) FROM patches WHERE fecha='$fecha';" 2>/dev/null || echo "0")
        
        log_success "Patches guardados en BD: $patch_count"
        
        return 0
    else
        log_error "Error durante el análisis para fecha: $fecha"
        log_error "Revise los logs para más detalles"
        return 1
    fi
}

# ============================================================================
# FUNCIÓN PRINCIPAL
# ============================================================================

main() {
    log_info "=========================================="
    log_info "INICIO DE EJECUCIÓN AUTOMÁTICA DEL CRON"
    log_info "=========================================="
    
    # Limpiar logs antiguos
    cleanup_old_logs
    
    # Calcular fecha del día anterior
    FECHA_ANALIZAR=$(calculate_previous_day)
    log_info "Fecha a analizar (D-1): $FECHA_ANALIZAR"
    
    # Verificar disponibilidad en la API del BOE
    if check_boe_availability "$FECHA_ANALIZAR"; then
        # Hay datos disponibles, ejecutar análisis
        if run_boe_analysis "$FECHA_ANALIZAR"; then
            log_success "=========================================="
            log_success "EJECUCIÓN COMPLETADA EXITOSAMENTE"
            log_success "=========================================="
            exit 0
        else
            log_error "=========================================="
            log_error "EJECUCIÓN FINALIZADA CON ERRORES"
            log_error "=========================================="
            exit 1
        fi
    else
        # No hay datos disponibles (404 o error)
        log_warning "=========================================="
        log_warning "NO SE EJECUTÓ EL ANÁLISIS (sin datos)"
        log_warning "=========================================="
        exit 0
    fi
}

# ============================================================================
# EJECUTAR
# ============================================================================

main "$@"

