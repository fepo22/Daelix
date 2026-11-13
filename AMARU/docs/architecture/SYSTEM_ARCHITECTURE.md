# Arquitectura del sistema

## Objetivo y límites

AMARU es un producto CRM de DAELIX. AMARU-VGV es la implementación piloto para VGV Punto Hidráulico. La primera capacidad comercial implementada es la gestión de clientes.

## Estilo arquitectónico

El sistema es un monolito modular desplegado como monorepo pnpm. La API NestJS separa módulos, controladores, servicios y acceso a datos; React consume su API REST. PostgreSQL es una dependencia separada, accedida por Prisma. El worker tiene su propio punto de entrada y no ejecuta trabajos todavía.

```text
Navegador -> React/Vite -> API REST NestJS -> Prisma -> PostgreSQL
                                             |
                                      Worker futuro
```

Los contratos TypeScript compartidos viven en `packages/shared`. Los módulos de API deben depender de servicios/interfaces y no acceder directamente a controladores de otros módulos.

## Instalación y aislamiento de clientes

Cada empresa tendrá una instalación independiente y una base PostgreSQL independiente. No hay tenant ID, aislamiento multiempresa ni SaaS en esta fase. Los secretos y la configuración específica de una instalación se proporcionan en el entorno de despliegue, no en el código.

## Límites de aplicación

- **Web:** React Router, layout con navegación, resumen y gestión de clientes conectada a la API, incluyendo importación y exportación `.xlsx`.
- **API:** NestJS REST, módulos de clientes/listas de precios, validación global, filtro central de errores, Swagger en `/docs`, chequeo de disponibilidad en `/health`.
- **Persistencia:** Prisma Client y migraciones PostgreSQL controladas. Clientes son personas o empresas y se relacionan opcionalmente con listas de precios.
- **Worker:** paquete separado, sin colas, tareas o dependencias de negocio predefinidas.
- **Importación transversal:** el paquete `import-engine` continúa reservado; la importación `.xlsx` de clientes pertenece al dominio de clientes.

## Configuración y errores

La API valida las variables de entorno al arrancar. La validación global rechaza propiedades no declaradas en DTOs. El filtro HTTP estandariza el formato de errores y registra excepciones inesperadas sin exponer stack traces al cliente.

## Evolución

El catálogo y los precios por producto deben modelarse antes de convertir las listas asignadas en tarifas efectivas. Autenticación y autorización se incorporarán con módulos y contratos específicos antes de exponer la aplicación fuera del entorno local. Una cola y el worker podrán añadirse sin separar prematuramente la API.
