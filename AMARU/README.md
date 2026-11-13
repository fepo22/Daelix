# AMARU-VGV

Piloto AMARU para VGV Punto Hidráulico, desarrollado por DAELIX. Incluye la base del monorepo y el primer módulo comercial: gestión de clientes (personas y empresas), asignación de listas de precios e importación/exportación Excel.

## Tecnologías

- pnpm workspaces y TypeScript estricto.
- React, Vite y React Router.
- NestJS, API REST y Swagger/OpenAPI.
- PostgreSQL y Prisma ORM.
- Docker Compose con persistencia local.

Las versiones instaladas quedan fijadas en `pnpm-lock.yaml`; las versiones de referencia están declaradas en cada `package.json`.

## Requisitos

- Node.js 24 LTS (mínimo declarado: 22.12).
- Corepack habilitado para pnpm 12.18.0.
- Docker Engine y Docker Compose.

## Instalación y ejecución local

Desde esta carpeta:

```powershell
corepack pnpm install
Copy-Item .env.example .env
docker compose up -d db
corepack pnpm db:generate
corepack pnpm db:migrate:dev
corepack pnpm dev
```

- Web: <http://localhost:5173>
- Salud de API: <http://localhost:3000/health>
- Swagger: <http://localhost:3000/docs>
- Módulo de clientes: <http://localhost:5173/clientes>

La variable `DATABASE_URL` debe apuntar a PostgreSQL. El servidor Vite reenvía `/api` a NestJS; la web contenerizada usa Nginx para enviar esas rutas a la API. Las credenciales de `.env.example` son exclusivamente locales, no son secretos ni deben reutilizarse en producción.

El módulo permite crear, consultar, buscar, filtrar, editar y desactivar clientes; configura nombres de listas de precios y los asigna a clientes. Las listas comienzan vacías: los precios por producto se definirán con el futuro catálogo. La plantilla Excel se descarga desde Clientes y la importación rechaza duplicados sin sobrescribirlos, informando las filas rechazadas.

Para levantar toda la pila en contenedores, incluyendo PostgreSQL, API y web:

```powershell
docker compose up --build
```

La API espera que PostgreSQL esté saludable y que el servicio de migración termine correctamente. Los datos de PostgreSQL persisten en el volumen Docker `amaru_postgres_data`. `docker compose down` conserva el volumen; no utilizar `docker compose down -v` salvo que se quiera eliminar explícitamente la base local.

## Estructura

```text
apps/
  api/          NestJS, módulos y esquema/migraciones Prisma
  web/          React, Vite, navegación y gestión de clientes
  worker/       Punto de partida sin trabajos configurados
packages/
  config/       Configuración TypeScript compartida
  import-engine/ Estructura vacía del futuro motor de importación
  shared/       Contratos TypeScript compartidos
infrastructure/docker/ Configuración de Nginx
docs/           Arquitectura, base de datos, desarrollo y decisiones
```

## Comandos

```powershell
corepack pnpm build
corepack pnpm typecheck
corepack pnpm db:generate
corepack pnpm db:migrate:dev
corepack pnpm db:migrate:deploy
corepack pnpm db:studio
```

Las migraciones deben revisarse y versionarse. El esquema contiene clientes y listas de precios; Prisma administra además su tabla interna de migraciones al aplicarlas.

## Estado actual

Estado actual: base técnica y primer módulo persistente de clientes. Los datos se guardan en PostgreSQL. Las listas son configurables y asignables, pero aún no almacenan precios por producto. No están implementados autenticación, permisos ni otros dominios comerciales. Cada instalación corresponde a una empresa y a una base PostgreSQL independiente; no se implementa multiempresa SaaS.

### Verificación pendiente

La compilación de API/web y una prueba local de alta/edición, asignación de listas e importación/exportación Excel pasaron. El despliegue estable y el flujo completo desde el navegador aún no están verificados: se detectaron conflictos de puertos, un fallo de arranque del contenedor API y timeouts posteriores al consultar PostgreSQL. No utilizar esta versión en producción ni exponerla públicamente sin autenticación y autorización.

## Documentación

- [Arquitectura del sistema](docs/architecture/SYSTEM_ARCHITECTURE.md)
- [Estructura del proyecto](docs/architecture/PROJECT_STRUCTURE.md)
- [Estrategia de base de datos](docs/database/DATABASE_STRATEGY.md)
- [Guía de desarrollo](docs/development/DEVELOPMENT_GUIDE.md)
- [ADR-001: arquitectura inicial](docs/decisions/ADR-001-INITIAL-ARCHITECTURE.md)
