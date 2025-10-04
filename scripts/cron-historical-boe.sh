#!/bin/bash
# scripts/cron-historical-boe.sh
# Script de cron para análisis automático de datos históricos del BOE
# Ejecuta todos los días a las 14:00, procesa datos del pasado hacia atrás desde 20251003

set -e  # Salir si hay errores

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

# Directorio base del proyecto
PROJECT_DIR="$HOME/patch_boe"
LOG_DIR="$PROJECT_DIR/logs/cron-historical"
LOG_RETENTION_DAYS=30
PROGRESS_FILE="$PROJECT_DIR/data/historical-progress.txt"
START_DATE="20251003"  # Fecha inicial (3 de octubre de 2025)

# Crear directorio de logs si no existe
mkdir -p "$LOG_DIR"

# Archivo de log con fecha
LOG_FILE="$LOG_DIR/boe-historical-$(date +%Y%m%d).log"

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
    find "$LOG_DIR" -name "boe-historical-*.log" -type f -mtime +$LOG_RETENTION_DAYS -delete 2>/dev/null || true
    log_info "Limpieza de logs completada"
}

# ============================================================================
# GESTIÓN DEL ARCHIVO DE PROGRESO
# ============================================================================

get_last_processed_date() {
    if [ -f "$PROGRESS_FILE" ]; then
        cat "$PROGRESS_FILE"
    else
        echo "$START_DATE"
    fi
}

set_last_processed_date() {
    local fecha=$1
    echo "$fecha" > "$PROGRESS_FILE"
    log_info "Progreso actualizado: última fecha procesada = $fecha"
}

# ============================================================================
# CALCULAR FECHA ANTERIOR (D-1 hacia atrás)
# ============================================================================

calculate_previous_date() {
    local fecha=$1
    
    # Convertir YYYYMMDD a formato para date
    local year=${fecha:0:4}
    local month=${fecha:4:2}
    local day=${fecha:6:2}
    
    # Calcular fecha anterior
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        date -j -v-1d -f "%Y-%m-%d" "$year-$month-$day" +%Y%m%d
    else
        # Linux
        date -d "$year-$month-$day -1 day" +%Y%m%d
    fi
}

# ============================================================================
# VERIFICAR DISPONIBILIDAD EN LA API DEL BOE
# ============================================================================

check_boe_availability() {
    local fecha=$1
    local api_url="https://www.boe.es/datosabiertos/api/boe/sumario/$fecha"

    log_info "Verificando disponibilidad del BOE para fecha histórica: $fecha"
    log_info "URL: $api_url"

    # Hacer petición GET y capturar código de respuesta (con header Accept)
    local http_code=$(curl -s -H "Accept: application/xml" -o /tmp/boe_response.xml -w "%{http_code}" "$api_url")
    
    log_info "Código HTTP recibido: $http_code"
    
    if [ "$http_code" = "404" ]; then
        # Verificar si es el XML de error esperado
        if grep -q "<code>404</code>" /tmp/boe_response.xml 2>/dev/null; then
            log_warning "No hay datos disponibles para la fecha histórica $fecha (404)"
            log_warning "Respuesta del BOE: La información solicitada no existe"
            rm -f /tmp/boe_response.xml
            return 1
        fi
    elif [ "$http_code" = "200" ]; then
        # Verificar que sea un XML válido con datos
        if grep -q "<code>200</code>" /tmp/boe_response.xml 2>/dev/null && \
           grep -q "<sumario>" /tmp/boe_response.xml 2>/dev/null; then
            log_success "Datos disponibles para la fecha histórica $fecha (200 OK)"
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
# EJECUTAR ANÁLISIS DEL BOE HISTÓRICO
# ============================================================================

run_historical_boe_analysis() {
    local fecha=$1
    
    log_info "=========================================="
    log_info "Iniciando análisis histórico del BOE para fecha: $fecha"
    log_info "=========================================="
    
    cd "$PROJECT_DIR"
    
    # Ejecutar el script de descarga y clasificación dentro del contenedor Docker
    log_info "Ejecutando descarga y clasificación histórica..."
    
    if sudo docker exec patch-legislativo node scripts/fetch-boe-historical.cjs "$fecha" >> "$LOG_FILE" 2>&1; then
        log_success "Análisis histórico completado exitosamente para fecha: $fecha"
        
        # Verificar cuántos patches se guardaron
        local patch_count=$(sudo docker exec patch-legislativo sqlite3 data/db/patches.db \
            "SELECT COUNT(*) FROM patches WHERE fecha='$fecha';" 2>/dev/null || echo "0")
        
        log_success "Patches históricos guardados en BD: $patch_count"
        
        return 0
    else
        log_error "Error durante el análisis histórico para fecha: $fecha"
        log_error "Revise los logs para más detalles"
        return 1
    fi
}

# ============================================================================
# CALCULAR ESTADÍSTICAS DE PROGRESO
# ============================================================================

calculate_progress_stats() {
    local fecha_actual=$1
    local fecha_inicio=$2
    
    # Calcular días procesados
    local dias_procesados=0
    local fecha_temp="$fecha_inicio"
    
    while [ "$fecha_temp" != "$fecha_actual" ]; do
        dias_procesados=$((dias_procesados + 1))
        fecha_temp=$(calculate_previous_date "$fecha_temp")
        
        # Evitar bucle infinito
        if [ $dias_procesados -gt 1000 ]; then
            break
        fi
    done
    
    echo "$dias_procesados"
}

# ============================================================================
# FUNCIÓN PRINCIPAL
# ============================================================================

main() {
    log_info "=========================================="
    log_info "INICIO DE EJECUCIÓN AUTOMÁTICA DEL CRON HISTÓRICO"
    log_info "=========================================="
    
    # Limpiar logs antiguos
    cleanup_old_logs
    
    # Obtener última fecha procesada
    LAST_PROCESSED=$(get_last_processed_date)
    log_info "Última fecha procesada: $LAST_PROCESSED"
    
    # Calcular fecha a procesar (día anterior)
    FECHA_ANALIZAR=$(calculate_previous_date "$LAST_PROCESSED")
    log_info "Fecha histórica a analizar: $FECHA_ANALIZAR"
    
    # Calcular estadísticas de progreso
    DIAS_PROCESADOS=$(calculate_progress_stats "$FECHA_ANALIZAR" "$START_DATE")
    log_info "Días procesados desde inicio: $DIAS_PROCESADOS"
    
    # Verificar disponibilidad en la API del BOE
    if check_boe_availability "$FECHA_ANALIZAR"; then
        # Hay datos disponibles, ejecutar análisis
        if run_historical_boe_analysis "$FECHA_ANALIZAR"; then
            # Actualizar progreso
            set_last_processed_date "$FECHA_ANALIZAR"
            
            log_success "=========================================="
            log_success "EJECUCIÓN HISTÓRICA COMPLETADA EXITOSAMENTE"
            log_success "Fecha procesada: $FECHA_ANALIZAR"
            log_success "Días procesados: $DIAS_PROCESADOS"
            log_success "=========================================="
            exit 0
        else
            log_error "=========================================="
            log_error "EJECUCIÓN HISTÓRICA FINALIZADA CON ERRORES"
            log_error "Fecha fallida: $FECHA_ANALIZAR"
            log_error "=========================================="
            exit 1
        fi
    else
        # No hay datos disponibles (404 o error)
        log_warning "=========================================="
        log_warning "NO SE EJECUTÓ EL ANÁLISIS HISTÓRICO (sin datos)"
        log_warning "Fecha sin datos: $FECHA_ANALIZAR"
        log_warning "=========================================="
        
        # Actualizar progreso aunque no haya datos (para continuar hacia atrás)
        set_last_processed_date "$FECHA_ANALIZAR"
        exit 0
    fi
}

# ============================================================================
# EJECUTAR
# ============================================================================

main "$@"
