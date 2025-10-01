# 🚀 Guía de Despliegue en Oracle Cloud Ubuntu

## 📋 Requisitos Previos

- **Servidor Oracle Cloud Ubuntu** configurado
- **Puerto 80** abierto en el firewall de Oracle Cloud  
- **Docker y Docker Compose** instalados
- **Git** instalado
- **Claves de Groq API** (4 claves recomendadas)

## 🔧 Conexión SSH

```bash
ssh -i C:\Users\Guillermo\.ssh\id_rsa ubuntu@158.179.210.136
```

## 🚀 Despliegue Paso a Paso

### 1. Limpiar sistema anterior

```bash
# Parar y eliminar contenedores Docker existentes
sudo docker stop $(sudo docker ps -aq) 2>/dev/null || true
sudo docker rm $(sudo docker ps -aq) 2>/dev/null || true
sudo docker system prune -af --volumes

# Eliminar directorio anterior
rm -rf ~/arquitectura

# Limpiar espacio en disco
sudo apt-get autoremove -y
sudo apt-get autoclean
```

### 2. Clonar repositorio

```bash
# Crear directorio y clonar proyecto
mkdir -p ~/patch_boe
cd ~/patch_boe
git clone https://github.com/guillermop2002/Patch-Boe.git .
```

### 3. Configurar variables de entorno

```bash
# Crear archivo .env.local con las claves de Groq
nano .env.local
```

**Contenido del archivo .env.local:**
```env
GROQ_API_KEY_1=tu_clave_groq_1_aqui
GROQ_API_KEY_2=tu_clave_groq_2_aqui  
GROQ_API_KEY_3=tu_clave_groq_3_aqui
GROQ_API_KEY_4=tu_clave_groq_4_aqui
```

### 4. Desplegar con Docker

```bash
# Construir y ejecutar la aplicación
sudo docker-compose up -d --build

# Verificar que está funcionando
sudo docker-compose ps
sudo docker-compose logs -f
```

## 🌐 Verificación del Despliegue

- **URL de la aplicación**: http://158.179.210.136
- **Puerto**: 80 (configurado en Oracle Cloud)
- **Estado del servicio**: `sudo docker-compose ps`
- **Logs en tiempo real**: `sudo docker-compose logs -f`

## 🔧 Comandos Útiles

### Gestión del servicio

```bash
# Parar la aplicación
sudo docker-compose down

# Reiniciar la aplicación  
sudo docker-compose restart

# Ver logs en tiempo real
sudo docker-compose logs -f

# Actualizar código desde GitHub
git pull origin main
sudo docker-compose up -d --build
```

### Monitoreo del sistema

```bash
# Estado de contenedores
sudo docker ps

# Uso de recursos del sistema
sudo docker stats

# Espacio en disco disponible
df -h
sudo docker system df
```

## 🐛 Solución de Problemas Comunes

### Error: Puerto 80 ocupado

```bash
# Verificar qué proceso usa el puerto 80
sudo netstat -tulpn | grep :80
sudo lsof -i :80

# Parar servicios web que puedan estar usando el puerto
sudo systemctl stop apache2 2>/dev/null || true
sudo systemctl stop nginx 2>/dev/null || true
```

### Error: Permisos de Docker

```bash
# Añadir usuario al grupo docker
sudo usermod -aG docker $USER
newgrp docker

# Reiniciar servicio Docker
sudo systemctl restart docker
```

## 📊 Estructura del Proyecto

```
~/patch_boe/
├── src/                    # Código fuente Next.js
│   ├── app/               # Páginas de la aplicación
│   ├── components/        # Componentes React
│   └── lib/              # Librerías y utilidades
├── scripts/               # Scripts de descarga BOE
├── data/                  # Datos persistentes (creado automáticamente)
│   ├── db/               # Base de datos SQLite
│   ├── json/             # Documentos procesados
│   └── xml/              # Documentos originales BOE
├── Dockerfile            # Configuración Docker
├── docker-compose.yml    # Orquestación de servicios
├── .env.local           # Variables de entorno (crear manualmente)
└── README.md            # Documentación del proyecto
```

## 🔄 Actualización del Proyecto

Para actualizar a la última versión:

```bash
cd ~/patch_boe
git pull origin main
sudo docker-compose up -d --build
```

## 📈 Uso de la Aplicación

Una vez desplegada, la aplicación estará disponible en http://158.179.210.136 con las siguientes funcionalidades:

- **🏠 Página principal**: Buscador de patches legislativos
- **ℹ️ Página "Acerca"**: Información sobre el proyecto
- **🔍 Búsqueda avanzada**: Filtros por fecha, tipo y relevancia
- **📊 Clasificación automática**: BUFF/NERF de cambios normativos
