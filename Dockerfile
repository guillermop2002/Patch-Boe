# Dockerfile para Patch Legislativo
FROM node:20-alpine AS base

# Instalar dependencias necesarias incluyendo distutils para better-sqlite3
RUN apk add --no-cache libc6-compat python3 python3-dev py3-pip make g++ sqlite

# Instalar distutils para Python
RUN pip3 install setuptools

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para build)
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar TypeScript para scripts
RUN npx tsc --outDir dist src/lib/database.ts src/lib/classifier.ts src/lib/openai.ts src/lib/fechas.ts --target es2017 --module commonjs --esModuleInterop --skipLibCheck --moduleResolution node

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
