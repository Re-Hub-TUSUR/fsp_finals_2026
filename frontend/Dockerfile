# Stage 1: Build React Vite app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Ключ и стиль 2GIS MapGL встраиваются в бандл на этапе сборки
ARG VITE_2GIS_KEY=""
ARG VITE_2GIS_STYLE_ID=""
ARG VITE_2GIS_STYLE_ID_DARK=""
ENV VITE_2GIS_KEY=$VITE_2GIS_KEY VITE_2GIS_STYLE_ID=$VITE_2GIS_STYLE_ID VITE_2GIS_STYLE_ID_DARK=$VITE_2GIS_STYLE_ID_DARK
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
