# Sistema de Cron Job para Análisis Automático del BOE

## 📋 Descripción

Sistema automatizado para ejecutar el análisis diario del BOE (Boletín Oficial del Estado) mediante cron job.

## ⏰ Configuración

- **Horario**: Todos los días a las 13:00 (hora del servidor)
- **Fecha analizada**: Siempre el día anterior (D-1)
- **Estado inicial**: DESACTIVADO (debe activarse manualmente)

## 🔍 Lógica de Validación

Antes de ejecutar el análisis, el sistema verifica la disponibilidad de datos en la API del BOE:

### Respuesta 404 (Sin datos)
```xml
<?xml version="1.0" encoding="utf-8"?> 
<response> 
  <status> 
    <code>404</code> 
    <text>La información solicitada no existe</text> 
  </status> 
  <data/> 
</response>
```
**Acción**: NO ejecutar análisis, registrar en log

### Respuesta 200 (Con datos)
```xml
<response> 
  <status> 
    <code>200</code> 
    <text>ok</text> 
  </status> 
  <data> 
    <sumario> 
      <metadatos> 
        <publicacion>BOE</publicacion> 
        <fecha_publicacion>20250927</fecha_publicacion> 
      </metadatos>
      ...
    </sumario>
  </data>
</response>
```
**Acción**: SÍ ejecutar análisis completo

## 📁 Estructura de Archivos

```
patch_boe/
├── scripts/
│   ├── cron-daily-boe.sh      # Script principal del cron
│   ├── install-cron.sh        # Instalador/gestor del cron
│   └── test-cron.sh           # Script de pruebas
└── logs/
    └── cron/
        ├── boe-analysis-YYYYMMDD.log
        └── cron-output.log
```

## 🚀 Instalación

### 1. Instalar el cron job (desactivado)

```bash
cd ~/patch_boe
chmod +x scripts/install-cron.sh
./scripts/install-cron.sh install
```

### 2. Verificar estado

```bash
./scripts/install-cron.sh status
```

### 3. Activar cuando esté listo

```bash
./scripts/install-cron.sh enable
```

## 🧪 Pruebas

### Prueba con el día anterior (D-1)

```bash
chmod +x scripts/test-cron.sh
./scripts/test-cron.sh
```

### Prueba con fecha específica

```bash
./scripts/test-cron.sh 20250929
```

### Limpiar datos de prueba

El script de prueba ofrece automáticamente limpiar los datos después de la ejecución.

## 📊 Sistema de Logs

### Ubicación
```
~/patch_boe/logs/cron/
```

### Tipos de logs registrados

- ❌ **Errores**: Siempre se registran
- ⚠️ **Warnings**: Cuando no hay datos (404)
- ✅ **Éxitos**: Se registran (pueden desactivarse si generan demasiado volumen)

### Rotación de logs

Los logs se mantienen durante **30 días** y luego se eliminan automáticamente.

### Ejemplo de log

```
[2025-10-02 13:00:01] [INFO] ==========================================
[2025-10-02 13:00:01] [INFO] INICIO DE EJECUCIÓN AUTOMÁTICA DEL CRON
[2025-10-02 13:00:01] [INFO] ==========================================
[2025-10-02 13:00:01] [INFO] Fecha a analizar (D-1): 20251001
[2025-10-02 13:00:02] [INFO] Verificando disponibilidad del BOE para fecha: 20251001
[2025-10-02 13:00:03] [SUCCESS] Datos disponibles para la fecha 20251001 (200 OK)
[2025-10-02 13:00:03] [INFO] Iniciando análisis del BOE para fecha: 20251001
[2025-10-02 13:10:45] [SUCCESS] Análisis completado exitosamente para fecha: 20251001
[2025-10-02 13:10:45] [SUCCESS] Patches guardados en BD: 87
[2025-10-02 13:10:45] [SUCCESS] EJECUCIÓN COMPLETADA EXITOSAMENTE
```

## 🛠️ Comandos de Gestión

### Ver estado del cron

```bash
./scripts/install-cron.sh status
```

### Activar cron

```bash
./scripts/install-cron.sh enable
```

### Desactivar cron

```bash
./scripts/install-cron.sh disable
```

### Desinstalar cron

```bash
./scripts/install-cron.sh uninstall
```

### Ver logs recientes

```bash
tail -f ~/patch_boe/logs/cron/boe-analysis-$(date +%Y%m%d).log
```

### Ver todos los logs

```bash
ls -lh ~/patch_boe/logs/cron/
```

## 📅 Calendario de Publicaciones del BOE

- **Lunes a Sábado**: Normalmente hay publicaciones
- **Domingo**: Normalmente NO hay publicaciones (excepcionalmente puede haber)

Por eso el cron se ejecuta **todos los días** y valida con la API si hay datos disponibles.

## ⚠️ Notas Importantes

1. **Estado inicial**: El cron job se instala DESACTIVADO por defecto
2. **Activación**: Solo activar después de afinar la clasificación
3. **Pruebas**: Siempre probar con `test-cron.sh` antes de activar
4. **Limpieza**: Limpiar datos de prueba para no mezclarlos con datos reales
5. **Logs**: Revisar periódicamente para detectar problemas

## 🔧 Troubleshooting

### El cron no se ejecuta

1. Verificar que está activado: `./scripts/install-cron.sh status`
2. Verificar permisos: `chmod +x scripts/cron-daily-boe.sh`
3. Revisar logs del sistema: `grep CRON /var/log/syslog`

### Error de permisos

```bash
chmod +x scripts/*.sh
```

### Ver ejecuciones del cron

```bash
grep "cron-daily-boe" /var/log/syslog
```

### Ejecutar manualmente para debug

```bash
bash -x scripts/cron-daily-boe.sh
```

## 📈 Monitoreo

### Verificar última ejecución

```bash
ls -lt ~/patch_boe/logs/cron/ | head -5
```

### Contar patches por fecha

```bash
sudo docker exec patch-legislativo sqlite3 data/db/patches.db \
  "SELECT fecha, COUNT(*) FROM patches GROUP BY fecha ORDER BY fecha DESC LIMIT 10;"
```

### Ver estadísticas de la BD

```bash
sudo docker exec patch-legislativo sqlite3 data/db/patches.db \
  "SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN tipo='buff' THEN 1 ELSE 0 END) as buffs,
    SUM(CASE WHEN tipo='nerf' THEN 1 ELSE 0 END) as nerfs
  FROM patches;"
```

## 🔄 Actualización del Sistema

Después de actualizar el código:

1. Hacer pull en el servidor
2. Reconstruir el contenedor Docker
3. Probar con `test-cron.sh`
4. Si todo funciona, el cron seguirá ejecutándose normalmente

```bash
cd ~/patch_boe
git pull origin main
sudo docker-compose down
sudo docker-compose build --no-cache
sudo docker-compose up -d
./scripts/test-cron.sh
```

