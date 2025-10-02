# Dockerfile para Patch Legislativo
FROM node:20-alpine AS base

# Instalar dependencias necesarias incluyendo distutils para better-sqlite3
RUN apk add --no-cache libc6-compat python3 python3-dev py3-pip py3-setuptools make g++ sqlite

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para build)
RUN npm ci

# Copiar código fuente
COPY . .

# Construir la aplicación Next.js
RUN npm run build

# Crear directorio para datos
RUN mkdir -p data/db data/json data/xml

# Exponer puerto 80
EXPOSE 80

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=80

# Comando para iniciar la aplicación
CMD npx next start -p 80
