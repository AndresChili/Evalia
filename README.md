# Evalia

> Convierte tus apuntes en tests de estudio, generados y validados por IA.

**🚀 [Probar la aplicación](https://evalia-livid.vercel.app)**

---

## Qué es

Evalia es una plataforma donde subes tu propio material de estudio (PDF, DOCX, imágenes con texto)
y la IA genera un test configurable a partir de ese contenido exclusivamente — no de conocimiento
externo del modelo. Puedes hacerlo en **modo estudio** (feedback inmediato) o **modo examen**
(corrección al final), guardarlo, repetirlo y compartirlo con amigos.

## Estado del proyecto

Funcionalmente completo y desplegado en Vercel (enlace arriba). Sigue siendo un proyecto personal
en el que itero de vez en cuando — ver [Qué se ha construido](#qué-se-ha-construido).

## Características

- Generación de tests desde PDF/DOCX/imágenes, con pipeline de validación multi-paso para minimizar
  ambigüedad, alucinación y preguntas sin respaldo en el documento.
- Alternativa múltiple (nº de opciones configurable) y Verdadero/Falso.
- Dificultad configurable (bajo/medio/alto) basada en complejidad de razonamiento, no en inventar datos.
- Modo estudio (feedback inmediato) y modo examen (corrección al final).
- Tres sistemas de puntuación: sin penalización, penalización personalizada por fallo, y "cada X
  fallos resta 1 punto".
- Tests guardados (snapshot reproducible), historial de intentos y revisión de errores.
- Amigos y envío de tests guardados entre usuarios.
- Cada pregunta queda trazada a la cita literal del documento que la originó.

## Fiabilidad de la IA — y sus límites

Ninguna IA generativa garantiza 0% de error. Evalia reduce la tasa de preguntas ambiguas o mal
fundamentadas mediante un pipeline de varias etapas (extracción → chunking → generación estructurada
→ comprobación de que la respuesta está respaldada por el texto → segunda pasada de validación →
deduplicación → descarte/regeneración), no con un único prompt. Detalle completo, incluidas las
limitaciones honestas, en [`docs/ai-pipeline.md`](./docs/ai-pipeline.md).
Las preguntas descartadas se cuentan y se muestran al usuario — no se ocultan.

## Stack técnico

| Capa                         | Elección                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| Framework                    | Next.js 16 (App Router, TypeScript)                                                  |
| UI                           | Tailwind CSS v4 + shadcn/ui                                                          |
| Backend                      | Server Actions / Route Handlers de Next.js (sin servicio separado)                   |
| Base de datos                | PostgreSQL + Prisma ORM                                                              |
| Autenticación                | Auth.js v5 (credentials + bcrypt, sesión JWT)                                        |
| Almacenamiento de documentos | Vercel Blob (privado, store 1GB gratis)                                              |
| Extracción de texto          | `unpdf` (PDF), `mammoth` (DOCX), `tesseract.js` (OCR imágenes, local)                |
| IA                           | Vercel AI SDK; Groq `gpt-oss-120b` genera, Gemini `flash-lite` valida — ambos gratis |
| Rate limiting                | Upstash Redis                                                                        |
| Email transaccional          | Resend                                                                               |
| Testing                      | Vitest + Testing Library                                                             |

## Arquitectura

Monolito Next.js desplegado en Vercel — sin backend independiente: las Server Actions cubren las
mutaciones internas y los Route Handlers quedan reservados para integraciones externas (webhooks,
autenticación, servir archivos privados). Decisión documentada con alternativas consideradas en
[`docs/architecture.md`](./docs/architecture.md).

```
app/
  (auth)/           login, registro, recuperación de contraseña (layout propio, sin sidebar)
  (app)/            dashboard, tests, documentos, social... (layout con sidebar, requiere sesión)
  api/
    auth/           handler de Auth.js
    avatars/[userId] sirve avatares del store privado de Blob (requiere sesión)
  page.tsx          landing pública
lib/
  actions/          Server Actions — una por dominio (auth, documents, tests, attempts, friends...)
  ai/               capa de abstracción de proveedor IA + pipeline de generación/validación
  documents/        extracción (PDF/DOCX/OCR), limpieza, chunking, validación de archivos
  scoring/          cálculo de notas y penalizaciones (testeado de forma exhaustiva y aislada)
  validation/       esquemas Zod de cada formulario/action
  auth.ts           configuración Auth.js
  db.ts             cliente Prisma (singleton)
  rate-limit.ts     limitadores Upstash por acción (degrada sin bloquear si no está configurado)
components/         componentes UI reutilizables (shadcn/ui + propios, organizados por dominio)
prisma/             schema.prisma, migraciones
docs/               pipeline de IA y arquitectura en detalle
tests/              tests automatizados (Vitest)
```

## Instalación

Requisitos: Node.js 24+, PostgreSQL (local o remoto).

```bash
git clone https://github.com/AndresChili/Evalia.git
cd Evalia
npm install
cp .env.example .env   # rellena las variables, ver abajo
npm run db:migrate     # aplica el schema a tu base de datos
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variables de entorno

Ver [`.env.example`](./.env.example) para la lista completa con comentarios. Resumen:

| Variable                        | Para qué                                   |
| ------------------------------- | ------------------------------------------ |
| `DATABASE_URL`                  | Conexión PostgreSQL                        |
| `AUTH_SECRET` / `AUTH_URL`      | Firma de sesión Auth.js                    |
| `GROQ_API_KEY`                  | Generación de preguntas (gratis)           |
| `GOOGLE_GENERATIVE_AI_API_KEY`  | Validación / fallback (Gemini, gratis)     |
| `BLOB_READ_WRITE_TOKEN`         | Subida de documentos a Vercel Blob         |
| `KV_REST_API_URL` / `_TOKEN`    | Rate limiting y cuotas de uso (Upstash)    |
| `RESEND_API_KEY` / `EMAIL_FROM` | Recuperación de contraseña, notificaciones |

Ninguna de estas claves debe commitearse. `.env` está en `.gitignore`; solo `.env.example` (sin
valores reales) se versiona.

## Scripts

```bash
npm run dev          # servidor de desarrollo
npm run build         # build de producción
npm run lint          # ESLint
npm run typecheck     # TypeScript sin emitir
npm run test           # Vitest
npm run format         # Prettier
npm run db:migrate     # Prisma Migrate (desarrollo)
npm run db:studio      # Prisma Studio
```

## Seguridad

- Contraseñas con `bcrypt`, nunca en texto plano.
- Toda consulta a datos propios de usuario está scoped por `userId` en el backend — nunca se confía
  en IDs recibidos del cliente sin verificar propiedad.
- Validación de archivos subidos por tipo MIME real detectado por magic bytes (no por extensión ni
  Content-Type declarado por el cliente, que pueden falsificarse), más límite de tamaño.
- El proveedor de IA recibe únicamente el texto extraído del documento (por fragmentos), nunca el
  archivo original.
- El archivo original se borra de Vercel Blob en cuanto se extrae el texto (éxito o error) — no hay
  opción de conservarlo, por simplicidad y para minimizar qué se almacena.
- Variables sensibles únicamente en entorno (Vercel / `.env` local), nunca en el repositorio.

Detalle completo, incluidas limitaciones conocidas, en [`SECURITY.md`](./SECURITY.md).

## Coste

Todo el stack corre en planes gratuitos (Vercel Hobby, Neon free tier, Upstash free tier, Vercel
Blob free tier, Resend free tier, Groq free tier, Gemini free tier). Ningún servicio tiene un
método de pago asociado — por diseño. Al tocar el límite gratuito, el servicio se limita o falla
de forma controlada, nunca cobra automáticamente. Si en algún momento se plantea pasar a un plan de
pago (más cuota de IA, más storage, etc.), es una decisión explícita, no algo que ocurra solo.

## Qué se ha construido

- Autenticación completa: registro, login, recuperación/cambio de contraseña, perfil con avatar,
  rutas protegidas.
- Sistema de documentos: subida, validación por contenido real (no por extensión), extracción de
  texto (PDF/DOCX/OCR) y borrado automático del archivo original tras procesarlo.
- Motor de IA con pipeline de varias etapas (generación → grounding → deduplicación → segunda
  validación con otro proveedor) — detalle en [`docs/ai-pipeline.md`](./docs/ai-pipeline.md).
- Tests en modo estudio o examen, tres sistemas de puntuación, guardado e historial de intentos.
- Sistema social: amigos, compartir tests guardados, notificaciones.
- Testing automatizado y auditoría de seguridad (IDOR, headers, CSP, rate limiting) — detalle en
  [`SECURITY.md`](./SECURITY.md).

Pendiente como mejora continua: auditoría de accesibilidad formal y revisión responsive más
exhaustiva en pantallas pequeñas.

## Contribución

Proyecto personal/educativo abierto a sugerencias. Ver [`CONTRIBUTING.md`](./CONTRIBUTING.md)
para cómo configurar el entorno, convenciones del proyecto, y qué comprobar antes de un PR.

## Nota

`AGENTS.md` y `CLAUDE.md` son configuración de mi editor/asistente de desarrollo, no documentación
del producto — ignóralos si no usas las mismas herramientas.

## Licencia

[MIT](./LICENSE)
