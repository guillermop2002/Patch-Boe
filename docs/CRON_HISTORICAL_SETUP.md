# Sistema de Cron Job Histórico para Análisis del BOE

## 📋 Descripción

Sistema automatizado para recopilar y analizar datos históricos del BOE (Boletín Oficial del Estado) mediante cron job. Este sistema procesa datos hacia atrás en el tiempo, comenzando desde el 3 de octubre de 2025.

## ⏰ Configuración

- **Horario**: Todos los días a las 14:00 (hora del servidor)
- **Fecha inicial**: 3 de octubre de 2025 (20251003)
- **Dirección**: Hacia atrás en el tiempo (cada día procesa D-1 del último procesado)
- **Estado inicial**: DESACTIVADO (debe activarse manualmente)

## 🔑 Claves API Exclusivas

Este cron job utiliza claves API exclusivas para evitar conflictos con el cron job principal. Estas claves deben configurarse como variables de entorno:

```env
GROQ_API_KEY_HISTORICAL_1=tu_clave_groq_historica_1_aqui
GROQ_API_KEY_HISTORICAL_2=tu_clave_groq_historica_2_aqui
GROQ_API_KEY_HISTORICAL_3=tu_clave_groq_historica_3_aqui
GROQ_API_KEY_HISTORICAL_4=tu_clave_groq_historica_4_aqui
```

**IMPORTANTE**: Estas claves son diferentes a las del cron principal para evitar rate limits.

## 🔍 Lógica de Funcionamiento

### Tracking de Progreso
- **Archivo de progreso**: `~/patch_boe/data/historical-progress.txt`
- **Contenido**: Última fecha procesada en formato YYYYMMDD
- **Persistencia**: Se actualiza después de cada ejecución exitosa

### Flujo de Ejecución
1. **Leer progreso**: Obtiene la última fecha procesada del archivo
2. **Calcular siguiente**: Calcula la fecha anterior (D-1 hacia atrás)
3. **Validar disponibilidad**: Verifica si hay datos en la API del BOE
4. **Procesar**: Si hay datos, ejecuta descarga y clasificación
5. **Actualizar progreso**: Guarda la fecha procesada en el archivo

### Validación de Disponibilidad
Antes de ejecutar el análisis, el sistema verifica la disponibilidad de datos en la API del BOE:

#### Respuesta 404 (Sin datos)
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
**Acción**: NO ejecutar análisis, actualizar progreso y continuar hacia atrás

#### Respuesta 200 (Con datos)
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
        <fecha_publicacion>20251002</fecha_publicacion> 
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
│   ├── cron-historical-boe.sh      # Script principal del cron histórico
│   ├── install-cron-historical.sh  # Instalador/gestor del cron histórico
│   ├── test-cron-historical.sh     # Script de pruebas históricas
│   └── fetch-boe-historical.cjs    # Script de descarga histórica
├── src/lib/
│   └── classifier-historical.ts    # Clasificador con claves API exclusivas
├── data/
│   └── historical-progress.txt     # Archivo de progreso histórico
└── logs/
    └── cron-historical/
        ├── boe-historical-YYYYMMDD.log
        └── cron-output.log
```

## 🚀 Instalación

### 1. Instalar el cron job histórico (desactivado)

```bash
cd ~/patch_boe
chmod +x scripts/install-cron-historical.sh
./scripts/install-cron-historical.sh install
```

### 2. Verificar estado

```bash
./scripts/install-cron-historical.sh status
```

### 3. Activar cuando esté listo

```bash
./scripts/install-cron-historical.sh enable
```

## 🧪 Pruebas

### Prueba con fecha del progreso actual

```bash
chmod +x scripts/test-cron-historical.sh
./scripts/test-cron-historical.sh
```

### Prueba con fecha específica

```bash
./scripts/test-cron-historical.sh 20251002
```

### Limpiar datos de prueba

El script de prueba ofrece automáticamente limpiar los datos después de la ejecución.

## 📊 Sistema de Logs

### Ubicación
```
~/patch_boe/logs/cron-historical/
```

### Tipos de logs registrados

- ❌ **Errores**: Siempre se registran
- ⚠️ **Warnings**: Cuando no hay datos (404)
- ✅ **Éxitos**: Se registran con estadísticas
- 📈 **Progreso**: Días procesados y estadísticas

### Rotación de logs

Los logs se mantienen durante **30 días** y luego se eliminan automáticamente.

### Ejemplo de log

```
[2025-10-02 14:00:01] [INFO] ==========================================
[2025-10-02 14:00:01] [INFO] INICIO DE EJECUCIÓN AUTOMÁTICA DEL CRON HISTÓRICO
[2025-10-02 14:00:01] [INFO] ==========================================
[2025-10-02 14:00:01] [INFO] Última fecha procesada: 20251003
[2025-10-02 14:00:01] [INFO] Fecha histórica a analizar: 20251002
[2025-10-02 14:00:01] [INFO] Días procesados desde inicio: 1
[2025-10-02 14:00:02] [INFO] Verificando disponibilidad del BOE para fecha histórica: 20251002
[2025-10-02 14:00:03] [SUCCESS] Datos disponibles para la fecha histórica 20251002 (200 OK)
[2025-10-02 14:00:03] [INFO] Iniciando análisis histórico del BOE para fecha: 20251002
[2025-10-02 14:10:45] [SUCCESS] Análisis histórico completado exitosamente para fecha: 20251002
[2025-10-02 14:10:45] [SUCCESS] Patches históricos guardados en BD: 23
[2025-10-02 14:10:45] [INFO] Progreso actualizado: última fecha procesada = 20251002
[2025-10-02 14:10:45] [SUCCESS] EJECUCIÓN HISTÓRICA COMPLETADA EXITOSAMENTE
```

## 🛠️ Comandos de Gestión

### Ver estado del cron histórico

```bash
./scripts/install-cron-historical.sh status
```

### Activar cron histórico

```bash
./scripts/install-cron-historical.sh enable
```

### Desactivar cron histórico

```bash
./scripts/install-cron-historical.sh disable
```

### Desinstalar cron histórico

```bash
./scripts/install-cron-historical.sh uninstall
```

### Resetear progreso histórico

```bash
./scripts/install-cron-historical.sh reset
```

### Ver logs recientes

```bash
tail -f ~/patch_boe/logs/cron-historical/boe-historical-$(date +%Y%m%d).log
```

### Ver todos los logs

```bash
ls -lh ~/patch_boe/logs/cron-historical/
```

## 📅 Calendario de Publicaciones del BOE

- **Lunes a Sábado**: Normalmente hay publicaciones
- **Domingo**: Normalmente NO hay publicaciones (excepcionalmente puede haber)

Por eso el cron se ejecuta **todos los días** y valida con la API si hay datos disponibles.

## ⚠️ Notas Importantes

1. **Estado inicial**: El cron job histórico se instala DESACTIVADO por defecto
2. **Activación**: Solo activar después de verificar que funciona correctamente
3. **Pruebas**: Siempre probar con `test-cron-historical.sh` antes de activar
4. **Progreso**: El archivo de progreso se mantiene entre reinstalaciones
5. **Claves API**: Usa claves exclusivas diferentes al cron principal
6. **Límites**: Se detiene automáticamente cuando encuentra muchos 404 consecutivos

## 🔧 Troubleshooting

### El cron histórico no se ejecuta

1. Verificar que está activado: `./scripts/install-cron-historical.sh status`
2. Verificar permisos: `chmod +x scripts/cron-historical-boe.sh`
3. Revisar logs del sistema: `grep CRON /var/log/syslog`

### Error de permisos

```bash
chmod +x scripts/*.sh
```

### Ver ejecuciones del cron histórico

```bash
grep "cron-historical-boe" /var/log/syslog
```

### Ejecutar manualmente para debug

```bash
bash -x scripts/cron-historical-boe.sh
```

### Problemas con el archivo de progreso

```bash
# Ver contenido actual
cat ~/patch_boe/data/historical-progress.txt

# Resetear progreso
./scripts/install-cron-historical.sh reset
```

## 📈 Monitoreo

### Verificar última ejecución

```bash
ls -lt ~/patch_boe/logs/cron-historical/ | head -5
```

### Ver progreso actual

```bash
cat ~/patch_boe/data/historical-progress.txt
```

### Contar patches históricos por fecha

```bash
sudo docker exec patch-legislativo sqlite3 data/db/patches.db \
  "SELECT fecha, COUNT(*) FROM patches WHERE fecha < '20251003' GROUP BY fecha ORDER BY fecha DESC LIMIT 10;"
```

### Ver estadísticas históricas de la BD

```bash
sudo docker exec patch-legislativo sqlite3 data/db/patches.db \
  "SELECT 
    COUNT(*) as total_historicos,
    SUM(CASE WHEN tipo='buff' THEN 1 ELSE 0 END) as buffs_historicos,
    SUM(CASE WHEN tipo='nerf' THEN 1 ELSE 0 END) as nerfs_historicos
  FROM patches WHERE fecha < '20251003';"
```

## 🔄 Actualización del Sistema

Después de actualizar el código:

1. Hacer pull en el servidor
2. Reconstruir el contenedor Docker
3. Probar con `test-cron-historical.sh`
4. Si todo funciona, el cron seguirá ejecutándose normalmente

```bash
cd ~/patch_boe
git pull origin main
sudo docker-compose down
sudo docker-compose build --no-cache
sudo docker-compose up -d
./scripts/test-cron-historical.sh
```

## 🆚 Diferencias con Cron Principal

| Aspecto | Cron Principal | Cron Histórico |
|---------|----------------|----------------|
| **Horario** | 13:00 | 14:00 |
| **Dirección** | D-1 hacia adelante | D-1 hacia atrás |
| **Fecha inicial** | Día anterior | 20251003 |
| **Claves API** | GROQ_API_KEY_1-4 | Claves exclusivas |
| **Progreso** | No necesita | Archivo de tracking |
| **Propósito** | Datos actuales | Datos históricos |

## 🎯 Objetivos del Sistema Histórico

1. **Recopilar datos históricos**: Procesar BOE desde octubre 2025 hacia atrás
2. **Evitar conflictos**: Usar claves API exclusivas
3. **Persistencia**: Mantener progreso entre ejecuciones
4. **Robustez**: Manejar errores y continuar procesamiento
5. **Monitoreo**: Logs detallados y estadísticas de progreso
