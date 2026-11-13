# ADR-001: Arquitectura inicial

- **Estado:** Aceptado
- **Fecha:** 2026-11-13
- **Contexto:** AMARU necesita una base que permita validar el producto con VGV sin acoplar la solución a una sola empresa ni introducir complejidad prematura.

## Decisiones

1. Usar un monorepo pnpm con aplicaciones separadas para web, API y worker, además de paquetes TypeScript internos.
2. Mantener un monolito modular NestJS para la API; separar módulos por dominio, conservando límites de controladores, servicios y persistencia.
3. Usar React, Vite y React Router para la web; mantener el layout inicial vacío.
4. Usar PostgreSQL y Prisma 7 con migraciones versionadas y un adaptador PostgreSQL explícito.
5. Ejecutar localmente con Docker Compose, chequeos de salud y volumen persistente para PostgreSQL.
6. Desplegar cada empresa como instalación independiente con su base de datos propia. No implementar multiempresa SaaS.
7. Mantener un paquete Worker separado como punto de evolución, sin elegir cola ni crear trabajos antes de definirlos.
8. No crear modelos ni funcionalidades comerciales en esta fase.

## Consecuencias

- El contrato REST y los tipos compartidos pueden evolucionar sin acoplar el frontend al ORM.
- Una instalación independiente simplifica el aislamiento de datos; operación, actualizaciones y respaldos se gestionan por instalación.
- La generación de cliente y las migraciones requieren `DATABASE_URL`.
- La autenticación, autorización, cola de tareas y modelo comercial quedan pendientes de decisiones futuras.

## Alternativas descartadas

- Microservicios iniciales: aumentarían la carga operativa sin una necesidad validada.
- Multiempresa SaaS: contradice el aislamiento por instalación aprobado para el piloto.
- Prisma `db push`: no ofrece historial revisable; se eligen migraciones versionadas.
