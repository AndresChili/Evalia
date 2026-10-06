# Seguridad

Este documento resume las decisiones y controles de seguridad de Evalia, y sus limitaciones
conocidas. Proyecto personal/educativo — revisado con cuidado, pero sin auditoría externa
profesional.

## Reportar una vulnerabilidad

Si encuentras un problema de seguridad, abre un issue privado o contacta directamente antes de
hacerlo público. No hay programa de recompensas (proyecto sin ánimo de lucro).

## Autenticación y sesiones

- Contraseñas con `bcrypt` (coste 12), nunca en texto plano. Ver [`lib/password.ts`](./lib/password.ts).
- Sesión vía JWT firmado (Auth.js v5) — el proveedor Credentials no admite sesión en base de
  datos por diseño de la propia librería.
- Recuperación de contraseña: token de un solo uso (`PasswordResetToken`), hasheado en DB
  (nunca se guarda el token en claro), expira a la hora, y la respuesta es siempre el mismo
  mensaje genérico exista o no la cuenta — evita enumeración de usuarios por email.
- Cambio de contraseña exige la contraseña actual.

## Autorización — protección contra IDOR

Regla aplicada de forma sistemática en **todas** las Server Actions y páginas con rutas
dinámicas (`/tests/[id]`, `/attempts/[id]`, `/api/avatars/[userId]`): nunca se confía en un ID
recibido del cliente sin verificar que el recurso pertenece al usuario autenticado (o, en
compartición de tests, que existe una amistad válida). El patrón es siempre:

```ts
const session = await auth();
if (!session?.user) return { error: "No autenticado." };

const recurso = await db.modelo.findUnique({ where: { id } });
if (!recurso || recurso.userId !== session.user.id) return { error: "No encontrado." };
```

Lo he probado con scripts de integración reales contra la base de datos (no solo revisando el
código) en documentos, tests, intentos, solicitudes de amistad y tests compartidos — un usuario
no puede leer, modificar ni aceptar/rechazar un recurso ajeno manipulando el id en la URL o en la
llamada a la action.

## Subida de archivos

- Validación por **magic bytes reales** (`lib/documents/validate-file.ts`, vía `file-type`), no
  por extensión ni `Content-Type` declarado por el cliente — ambos pueden falsificarse.
- Límite de tamaño (20MB documentos, 3MB avatares) comprobado en servidor, no solo en el
  input del navegador.
- Cap de documentos por usuario (30) y rate limiting en subidas — control de abuso/coste.
- El archivo original se borra de almacenamiento en cuanto se extrae el texto (éxito o error);
  solo el texto extraído persiste.

## Almacenamiento privado

- Documentos y avatares viven en un store de Vercel Blob **privado** — nunca accesibles por URL
  pública directa. Los avatares se sirven a través de una ruta propia autenticada
  (`app/api/avatars/[userId]/route.ts`) que exige sesión antes de leer del store.
- Comprobado manualmente que un blob privado no responde en una URL pública directa.

## Rate limiting

Vía Upstash Redis (plan gratuito, auto-upgrade desactivado explícitamente para que nunca pase a
plan de pago sin autorización). Limitadores activos: login, registro, recuperación de
contraseña, subida de documentos, generación de tests. Si Upstash no está configurado (p. ej. en
desarrollo local sin provisionar), el sistema **no bloquea nada** en vez de romper — ver
[`lib/rate-limit.ts`](./lib/rate-limit.ts). En producción debe estar configurado.

## Headers de seguridad

Configurados en [`next.config.ts`](./next.config.ts) para todas las rutas:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (cámara/micrófono/geolocalización desactivados — no se usan)
- `Content-Security-Policy` restrictiva (`default-src 'self'`, sin dominios externos)

**Limitación conocida:** `script-src` incluye `'unsafe-inline'`, necesario porque Next.js
inyecta scripts de hidratación inline y este proyecto no implementa un CSP basado en nonces
(requeriría generar y propagar un nonce por request desde `proxy.ts`). Esto significa que la CSP
actual mitiga claro-jacking, carga de recursos externos no autorizados y fijación de MIME-type,
pero no es una defensa completa contra XSS por sí sola — la primera línea de defensa contra XSS
sigue siendo el escapado automático de React y la validación de inputs con Zod.

## CSRF

Las Server Actions de Next.js validan el header `Origin` contra el host de la petición de forma
automática (protección nativa del framework) — no se ha desactivado en ningún punto.

## Validación de datos

Todo input de usuario que llega a una Server Action se valida con Zod en el servidor antes de
tocar la base de datos — nunca se confía solo en la validación del formulario en el cliente.

## IA y privacidad del contenido

El proveedor de IA recibe únicamente fragmentos de texto ya extraído del documento, nunca el
archivo original. Detalle completo del pipeline de generación en
[`docs/ai-pipeline.md`](./docs/ai-pipeline.md).

## Secretos

- Ninguna clave/API key/secreto vive en el repositorio — todas en variables de entorno
  (`.env.local` en desarrollo, Vercel en producción). `.env*` está en `.gitignore`; solo
  `.env.example` (sin valores reales) se versiona.
- Revisado con `git status` / `git ls-files` que ningún archivo `.env` real ha llegado a estar
  tracked.

## Dependencias — vulnerabilidades conocidas aceptadas

`npm audit` reporta vulnerabilidades "high" en `braces`/`fast-glob`/`micromatch` (vía la CLI de
`shadcn` y `eslint-config-next`) y en `deepmerge-ts`/`mysql2` (vía `@prisma/config`, dependencia
interna de la **CLI** de Prisma, no de `@prisma/client`). Las tres son dependencias de
**herramientas de desarrollo/build** (`devDependencies`), nunca se incluyen en el bundle de
producción que corre en Vercel. Arreglarlas con `npm audit fix --force` forzaría downgrades
mayores (`prisma@6`, `shadcn@1`) con cambios incompatibles sobre código ya construido y probado
contra las versiones actuales — se ha preferido documentar el riesgo (bajo: solo afecta a quien
ejecuta `npm run build`/`npx shadcn` localmente, nunca al usuario final de la app) en vez de
romper el proyecto para cerrar una vulnerabilidad sin ruta de explotación real en producción.
Revisar con `npm audit` periódicamente por si aparecen versiones corregidas sin breaking changes.

## Coste y abuso

Ver la sección "Coste" del [README](./README.md) — todos los proveedores están en tier gratuito,
con límites técnicos (no de dinero) y auto-upgrade desactivado donde la plataforma lo permite.
