# Etapa 1: Construcción de la aplicación React
FROM node:18-alpine AS build

WORKDIR /app

# Copiar y instalar dependencias antes de copiar todo el código
COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile

# Copiar el resto del código fuente
COPY . .

# Construir la aplicación
RUN npm run build

# Etapa 2: Servir la aplicación con Nginx
FROM nginx:alpine

# Copiar archivos compilados al directorio de Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto 80
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
