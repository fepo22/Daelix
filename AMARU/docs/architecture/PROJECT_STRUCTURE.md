# Estructura del monorepo

```text
apps/
  api/
    prisma/                 Esquema y migraciones Prisma
    src/
      common/filters/       Filtro HTTP global
      customers/            Clientes, listas de precios e integración Excel
      health/               Disponibilidad de API y PostgreSQL
      prisma/               Módulo y servicio de acceso a datos
  web/
    src/app/shell/           Layout, navegación e iconografía
    src/app/pages/           Resumen, clientes y pantallas iniciales
    src/styles/              Estilos globales y responsive
  worker/                    Proceso inicial sin trabajos
packages/
  config/                    Configuración TypeScript compartida
  import-engine/             Estructura vacía del futuro motor
  shared/                    Contratos sin reglas de negocio
infrastructure/docker/       Configuración de Nginx
docs/
  architecture/
  database/
  development/
  decisions/
```

## Convenciones

- `apps/*` son procesos ejecutables/desplegables; `packages/*` son librerías internas.
- API: cada dominio organiza rutas/controladores, servicios y persistencia sin mezclar responsabilidades.
- Web: `app` aloja composición, rutas y shell; cada área funcional se incorpora como módulo independiente.
- `packages/shared` solo contiene contratos neutros que puedan usarse en más de una aplicación.
- `packages/config` centraliza opciones compartidas de TypeScript.
- El modelo de clientes/listas de precios se versiona mediante migraciones Prisma.

## Herramientas de workspace

`pnpm-workspace.yaml` incluye todas las aplicaciones y paquetes. `pnpm-lock.yaml` fija la resolución reproducible. Las dependencias entre paquetes internos usan el protocolo `workspace:*`.
