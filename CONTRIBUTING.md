# Contribuir a Evalia

Gracias por el interés. Esto es un proyecto personal/educativo, abierto a sugerencias y PRs —
estas son las pautas para que el proceso sea fluido para ambas partes.

## Antes de un PR grande

Abre un issue primero describiendo qué quieres cambiar y por qué. Para fixes pequeños (typos,
bugs claros, mejoras menores) puedes abrir el PR directamente.

## Configurar el entorno

Sigue la sección [Instalación](./README.md#instalación) del README. Resumen rápido:

```bash
git clone https://github.com/AndresChili/Evalia.git
cd Evalia
npm install
cp .env.example .env   # rellena las variables — ver README para dónde conseguir cada clave gratis
npm run db:migrate
npm run dev
```

## Antes de abrir el PR

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Los cuatro deben pasar sin errores. `npm run format` arregla el estilo automáticamente si hace
falta.

## Convenciones del proyecto

- **TypeScript estricto**, sin `any` salvo que esté genuinamente justificado.
- **Server Actions** para mutaciones internas (`lib/actions/`), **Route Handlers** solo para lo
  que de verdad necesita ser una API HTTP (ver [`docs/architecture.md`](./docs/architecture.md)).
- **Toda Server Action que toque datos de un usuario debe verificar propiedad** del recurso
  contra `session.user.id` antes de leer o escribir — nunca confiar en un id recibido del
  cliente. Ver `SECURITY.md` para el patrón exacto.
- **Validación con Zod** en el servidor para cualquier input de usuario, no solo en el cliente.
- **Tests para lógica con reglas exactas** (puntuación, validación, parsing) — no hace falta
  testear cada componente de UI, pero si una función tiene casos borde específicos (como el
  cálculo de penalizaciones), que tenga tests que los cubran explícitamente.
- Sin comentarios que expliquen _qué_ hace el código (el código ya lo dice) — solo _por qué_,
  cuando no sea obvio.

## Reportar bugs

Incluye: qué esperabas, qué pasó, pasos para reproducirlo, y si es posible, el error exacto de
consola/terminal. Para vulnerabilidades de seguridad, ver [`SECURITY.md`](./SECURITY.md).

## Licencia

Al contribuir, aceptas que tu contribución se licencie bajo la misma [licencia MIT](./LICENSE)
del proyecto.
