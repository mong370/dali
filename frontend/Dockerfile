# Build from the repository root: docker build -f frontend/Dockerfile .
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci -w frontend --include-workspace-root=false
COPY frontend frontend
RUN npm run build -w frontend

FROM nginx:1.31-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
