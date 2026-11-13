# Guía de desarrollo

## Requisitos

- Node.js 24 LTS (mínimo 22.12).
- Corepack y pnpm 12.18.0.
- Docker Engine con Docker Compose.

## Preparación

Desde la carpeta `AMARU`:

```powershell
corepack pnpm install
Copy-Item .env.example .env
```

El `.env` local está ignorado por Git. PostgreSQL se publica en el puerto 5433 para evitar conflictos con una instalación local en 5432; cambiar `POSTGRES_PORT` y `DATABASE_URL` en caso de otro conflicto. Las contraseñas de ejemplo son solo locales.

## Desarrollo con PostgreSQL en Docker

```powershell
docker compose up -d db
corepack pnpm db:generate
corepack pnpm db:migrate:dev
corepack pnpm dev
```

La web queda en `http://localhost:5173`, la API en `http://localhost:3000`, el health check en `/health` y Swagger en `/docs`. `pnpm dev` levanta API y web en paralelo. La web reenvía las rutas `/api/*` a la API. Se requiere que PostgreSQL esté disponible antes de iniciar la API.

## Módulo de clientes

El frontend ofrece búsqueda, filtros por tipo y estado, paginación, alta/edición, activación/desactivación y asignación de listas de precios. Estas listas son nombres configurables; las tarifas por producto quedan pendientes del catálogo.

La sección permite descargar una plantilla `.xlsx`, importar clientes y exportar los registros persistidos. La importación acepta hasta 5.000 filas (máximo 5 MB), agrega las filas válidas y devuelve errores de fila; no sobrescribe clientes existentes. Correo electrónico e identificación fiscal se usan para detectar duplicados.

La API publica `GET/POST /customers`, `GET /customers/:id`, `PATCH /customers/:id`, `GET /customers/stats`, `GET /customers/export`, `GET /customers/import-template`, `POST /customers/import` y `GET/POST/PATCH /price-lists`.

## Pila completamente contenerizada

```powershell
docker compose up --build
```

Compose verifica PostgreSQL, ejecuta `prisma migrate deploy`, inicia la API y finalmente sirve la web estática con Nginx. Comprueba los estados con `docker compose ps` y los registros con `docker compose logs -f api`.

## Compilación y tipos

```powershell
corepack pnpm build
corepack pnpm typecheck
```

## Persistencia y limpieza

El volumen `amaru_postgres_data` sobrevive a `docker compose down`. No borrar el volumen al limpiar contenedores salvo decisión explícita de eliminar los datos. No versionar `.env`, respaldos ni datos reales.

## Evolución

Mantener separación por dominios y capas. Revisar y versionar los cambios del esquema y migraciones antes de desplegarlos. No implementar autenticación, roles o permisos sin una fase de diseño y seguridad dedicada.
