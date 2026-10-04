# Arquitectura

Decisiones de arquitectura de Evalia y las alternativas que se consideraron, para que quede
constancia del porqué y no solo del qué.

## Monolito Next.js, no backend separado

**Decisión:** todo vive en una única app Next.js desplegada en Vercel — Server Actions para
mutaciones internas, Route Handlers solo para lo que de verdad necesita ser una API HTTP
(autenticación, servir archivos privados).

**Alternativas consideradas:**

- _Backend independiente (Express/Fastify/NestJS) + frontend separado._ Descartado: añade una
  capa de despliegue, autenticación entre servicios y CORS que no aporta nada a este tamaño de
  proyecto. Las Server Actions de Next.js ya dan tipado end-to-end sin esa complejidad.
- _API GraphQL._ Descartado: no hay consumidores externos de una API pública todavía: sobrecarga
  innecesaria frente a REST/Server Actions para un cliente único (la propia app).

**Cuándo reconsiderar:** si en algún momento se necesita una API pública para terceros (app
móvil, integraciones externas), ahí sí tendría sentido extraer Route Handlers dedicados con su
propio versionado — la separación `lib/actions/` (mutaciones internas) vs `app/api/` (externo) ya
deja ese camino abierto sin reescribir nada.

## Base de datos: PostgreSQL + Prisma, vía Neon

**Decisión:** Postgres relacional con Prisma ORM, hosteado en Neon (Marketplace de Vercel, tier
gratuito).

**Alternativas consideradas:**

- _MongoDB / documento._ Descartado: el dominio (usuarios, tests, preguntas, amistades,
  intentos) es profundamente relacional — relaciones muchos-a-muchos (amigos, tests
  compartidos), integridad referencial importante (un intento no puede existir sin su test), y
  consultas con joins frecuentes. Postgres es la elección natural.
- _SQLite / Turso._ Válido para un proyecto muy pequeño, pero Neon da connection pooling y
  escalabilidad sin esfuerzo extra, y sigue siendo gratis a esta escala.
- _Drizzle en vez de Prisma._ Ambos son razonables; Prisma se eligió por velocidad de desarrollo
  y migraciones más simples de seguir para alguien repasando el repo por primera vez.

**Nota Prisma 7:** desde la v7, el cliente requiere un _driver adapter_ explícito en runtime
(`@prisma/adapter-pg`) — ya no hay conexión implícita por URL en el schema. Ver `lib/db.ts`.

## Almacenamiento de documentos y avatares: Vercel Blob privado

**Decisión:** un único store privado de Vercel Blob para documentos y avatares. Los documentos
se sirven solo internamente durante el procesamiento (y se borran tras extraer el texto); los
avatares se sirven a través de una ruta propia autenticada (`/api/avatars/[userId]`).

**Por qué privado y no público:** un store público habría sido más simple de servir con
`next/image` directamente, pero expone cualquier archivo subido a cualquiera con la URL. Dado
que los documentos pueden contener apuntes con información personal, privado por defecto fue la
decisión correcta — el coste en complejidad (una ruta propia para los avatares) es pequeño.

## IA: capa de abstracción propia sobre Vercel AI SDK

**Decisión:** `lib/ai/provider.ts` expone `getGeneratorModel()` / `getValidatorModel()`; nada
más en el código habla directamente con `@ai-sdk/groq` o `@ai-sdk/google`.

**Por qué:** los modelos y proveedores de IA cambian rápido (de hecho, los nombres de modelo que
se eligieron en el diseño inicial quedaron obsoletos _durante la construcción_ de este mismo
proyecto). Aislar la elección de proveedor en un único archivo significa que cambiar de modelo,
añadir un fallback, o algún día incorporar un proveedor de pago (con autorización explícita) es
un cambio de una línea, no una reescritura del pipeline. Detalle completo del pipeline de
generación/validación en [`ai-pipeline.md`](./ai-pipeline.md).

## Rate limiting: Upstash Redis, degradación sin bloqueo

**Decisión:** `lib/rate-limit.ts` crea limitadores por acción (login, registro, subida de
documentos, generación de tests, etc.) respaldados por Upstash Redis. Si Upstash no está
configurado (p. ej. clonando el repo sin provisionarlo todavía), el sistema **no bloquea nada**
en vez de romper `npm run dev`.

**Por qué esta forma de degradar:** forzar que Upstash esté configurado para poder siquiera
arrancar el proyecto en local sería mala experiencia para cualquiera que clone el repo. El
trade-off es consciente: en desarrollo sin Upstash, no hay protección real contra abuso — pero en
producción (Vercel) si está provisionado y conectado, si no lo configuras ahí, es un error de
despliegue, no un bug silencioso (documentado en `SECURITY.md`).

## Modelo de datos — decisiones no obvias

- **`Test` es un snapshot inmutable.** Una vez generado, un test (preguntas, opciones) no cambia.
  "Guardar un test" es solo un marcador (`SavedTest`) sobre ese snapshot — repetirlo es crear un
  nuevo `TestAttempt` contra el mismo `Test`, nunca regenerar contenido. Esto se decidió
  explícitamente así (no "generar variante nueva cada vez") tras validarlo con el responsable del
  proyecto.
- **`Test.documentId` es nullable con `onDelete: SetNull`.** El documento origen puede borrarse
  (por privacidad, o simplemente porque el usuario lo borra) sin romper los tests ya generados a
  partir de él — cada `Question` guarda su propia cita literal (`sourceQuote`), no depende de que
  el chunk origen siga existiendo.
- **Modo (estudio/examen) vive en `TestAttempt`, no en `Test`.** Si viviera en el test, no se
  podría repetir el mismo test guardado en ambos modos — justo lo que pide la especificación
  original.
- **Compartir un test clona todo el contenido**, no crea una referencia. `originTestId` traza de
  dónde vino la copia, pero borrar el test original no afecta a la copia del receptor —
  verificado explícitamente con un test de integración.

## Lo que se dejó fuera a propósito (por ahora)

- **Colas en background** (Vercel Queue/Workflow) para la generación de tests: el pipeline corre
  síncrono dentro de la Server Action. A la escala actual (uso personal/educativo) es aceptable;
  sería lo primero que se movería a background si el proyecto creciera mucho.
- **CSP basada en nonces**: la actual usa `'unsafe-inline'` en `script-src` por simplicidad
  (ver `SECURITY.md`).
- **`UsageQuota`** existe en el schema (contador de uso diario) pero no está conectado a ninguna
  lógica — el control de coste real se implementó vía rate limiting de Upstash en su lugar, que
  resultó suficiente. El modelo queda documentado aquí para quien se pregunte por qué existe sin
  usarse.
