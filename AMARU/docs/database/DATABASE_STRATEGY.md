# Estrategia de base de datos

## PostgreSQL

PostgreSQL es el motor relacional de cada instalación AMARU. Compose publica el puerto configurable (5433 por defecto) para el desarrollo local y conserva los datos en el volumen nombrado `amaru_postgres_data`. El puerto alternativo evita colisiones con una instalación PostgreSQL local habitual en 5432; se puede cambiar mediante `POSTGRES_PORT` y el puerto de `DATABASE_URL`.

## Prisma

El esquema está en `apps/api/prisma/schema.prisma`. La configuración de Prisma 7 y la URL de datasource se declaran en `apps/api/prisma.config.ts`; `DATABASE_URL` se lee del entorno. El cliente PostgreSQL usa el adaptador `@prisma/adapter-pg`.

El modelo comercial inicial contiene:

- `Customer`: persona o empresa, nombre, identificación fiscal, correo, teléfono, dirección/localidad, observaciones y estado activo/inactivo. El correo y la identificación fiscal son únicos cuando están informados.
- `PriceList`: nombre y descripción de una lista, activa/inactiva. Un cliente puede tener una lista asignada; desactivarla no elimina la asignación existente.

Las listas comienzan vacías y no contienen todavía tarifas por producto. Estas se incorporarán cuando se apruebe el catálogo de productos. `20261113000000_initial_setup` es el baseline sin DDL de aplicación; la migración `customer_management` agrega las tablas comerciales iniciales. Prisma crea además su tabla interna `_prisma_migrations`.

## Ciclo de migración

1. Editar el esquema Prisma y revisar el cambio.
2. Con PostgreSQL disponible, generar una migración versionada con `pnpm db:migrate:dev -- --name <nombre>`.
3. Revisar y versionar los archivos de `apps/api/prisma/migrations`.
4. En despliegues, aplicar solo migraciones versionadas con `pnpm db:migrate:deploy`.

No usar `db push` en entornos persistentes: las migraciones versionadas son el mecanismo de cambio. El Compose local usa un servicio dedicado de migración que se ejecuta después de que PostgreSQL esté saludable y antes de iniciar la API.

## Seguridad y respaldo

`.env` no se versiona. `.env.example` contiene únicamente credenciales locales de demostración, no válidas para producción. En despliegues, inyectar `DATABASE_URL` y credenciales mediante el gestor de secretos del entorno. Planificar respaldos y restauraciones por instalación antes de producción.
