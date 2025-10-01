# Dockerfile para Patch Legislativo
FROM node:18-alpine AS base

# Instalar dependencias necesarias
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

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
CMD ["npm", "start"]
