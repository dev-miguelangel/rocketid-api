# Especificaciones de Despliegue

## Archivos generados

| Archivo | Propósito |
|---|---|
| `Dockerfile` | Build multi-stage para development, build y production |
| `.dockerignore` | Excluye archivos innecesarios del contexto de build |

---

## Dockerfile — Stages

### `development`
Instala todas las dependencias (incluyendo devDependencies) y levanta el servidor con hot-reload.

```bash
docker build --target development -t nest-google-api:dev .
docker run -p 3000:3000 -v $(pwd)/src:/app/src nest-google-api:dev
```

### `build`
Compila TypeScript a JavaScript en `/app/dist`. No genera una imagen final utilizable por sí solo; es un stage intermedio.

### `production`
Imagen final liviana. Solo instala dependencias de producción (`--omit=dev`) y copia el `dist/` compilado desde el stage `build`.

```bash
docker build --target production -t nest-google-api:prod .
docker run -p 3000:3000 --env-file .env nest-google-api:prod
```

> Por defecto, `docker build` sin `--target` construye hasta el último stage (`production`).

---

## Despliegue en Coolify

### Requisitos previos
- Repositorio Git conectado a Coolify (GitHub, GitLab, Gitea, etc.)
- Puerto `3000` disponible o mapeado en Coolify

### Pasos

1. **Nueva aplicación** → `+ New Resource` → `Application`
2. **Source** → selecciona tu repositorio y rama (`main`)
3. **Build Pack** → `Dockerfile`
4. **Configuración de build**:
   - Dockerfile location: `/Dockerfile`
   - Build target: `production`
5. **Network** → Port: `3000`
6. **Variables de entorno** → agrega las variables necesarias (ver sección siguiente)
7. **Deploy** → `Save` → `Deploy`

### Variables de entorno recomendadas

Configúralas en Coolify en la sección **Environment Variables**:

```env
NODE_ENV=production
PORT=3000
```

Agrega aquí cualquier variable adicional que tu aplicación requiera (credenciales de Google API, base de datos, etc.).

---

## Uso local con Docker

### Build de producción
```bash
docker build -t nest-google-api .
```

### Ejecutar contenedor
```bash
docker run -d \
  --name nest-google-api \
  -p 3000:3000 \
  --env-file .env \
  nest-google-api
```

### Ver logs
```bash
docker logs -f nest-google-api
```

### Detener y eliminar
```bash
docker stop nest-google-api && docker rm nest-google-api
```

---

## Notas sobre vulnerabilidades

El IDE reporta vulnerabilidades en `node:20-alpine`. Para mitigarlas se puede usar una versión más específica o con parches aplicados:

```dockerfile
# Cambiar en los tres stages:
FROM node:20.19-alpine AS development
FROM node:20.19-alpine AS build
FROM node:20.19-alpine AS production
```

Verifica la versión más reciente con parches en [hub.docker.com/_/node](https://hub.docker.com/_/node).

---

## .dockerignore

Excluye del contexto de build:
- `node_modules/` y `dist/` — se regeneran dentro del contenedor
- `.env` y `.env.*` — las variables se inyectan en runtime
- `test/`, `docs/`, `README.md` — no necesarios en producción
- Archivos de editor (`.vscode`, `.idea`) y sistema (`.DS_Store`)
