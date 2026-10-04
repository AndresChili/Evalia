# Pipeline de generación y validación de preguntas

Este documento describe cómo Evalia convierte un documento en preguntas, y por qué el proceso
tiene varias etapas en vez de un único prompt "genera 10 preguntas sobre esto".

## Por qué no un único prompt

Pedirle a un modelo "genera 20 preguntas sobre este PDF" produce con frecuencia: preguntas
ambiguas, respuestas que no aparecen en el material, varias opciones defendibles como correctas,
distractores absurdos, o directamente información inventada. Ninguno de estos fallos es visible
con solo mirar el JSON de salida — hace falta un proceso de verificación independiente de la
generación.

## Las etapas (`lib/ai/`)

1. **Extracción + chunking** (Fase 4, `lib/documents/`) — el documento ya se trocea en
   fragmentos de ~1200 caracteres con solape antes de llegar aquí. Cada pregunta se genera a
   partir de **un fragmento concreto**, nunca del documento completo: así el modelo tiene menos
   superficie para divagar y la cita de respaldo es verificable.

2. **Generación estructurada** (`generate-questions.ts`) — se le pasa al modelo el fragmento y se
   le pide un lote de preguntas candidatas en un esquema Zod fijo (`schemas.ts`): enunciado,
   opciones, cuál es correcta, una **cita literal** del fragmento que respalda la respuesta, y una
   explicación. `generateObject` del AI SDK fuerza esa forma — no se parsea texto libre.

3. **Comprobación de forma** (`validate-question.ts` → `hasValidShape`) — gratis, sin llamar a
   ningún modelo: exactamente una opción marcada correcta, nº de opciones correcto, sin opciones
   duplicadas, Verdadero/Falso con sus dos opciones exactas. Descarta basura estructural antes de
   gastar ninguna llamada de validación.

4. **Grounding check** (`grounding.ts`) — la cita que el modelo dice haber extraído del fragmento
   se compara contra el fragmento real (normalizando acentos/mayúsculas/puntuación, con tolerancia
   a pequeñas variaciones). Si la cita no aparece de verdad en el texto, se descarta sin pasar a la
   siguiente etapa: es la defensa principal contra alucinación.

5. **Deduplicación** (`dedupe.ts`) — similitud de Jaccard sobre las palabras del enunciado contra
   las preguntas ya aceptadas en ese test. **Limitación conocida:** esto detecta preguntas con
   redacción casi idéntica, no paráfrasis semánticas sofisticadas (dos preguntas distintas en
   redacción pero que preguntan esencialmente lo mismo pueden colarse ambas). Se eligió
   deliberadamente en vez de deduplicación por embeddings para no gastar una llamada de IA extra
   por pregunta — con los límites gratuitos de Groq/Gemini, cada llamada cuenta.

6. **Segunda pasada de validación por IA** (`validate-question.ts` → `validateWithAI`) — un
   modelo **distinto** al generador (Gemini, mientras que la generación usa Groq) actúa de revisor
   escéptico: ¿es ambigua? ¿hay una única respuesta correcta clara? ¿la cita respalda _de verdad_
   esa respuesta? Usar un proveedor distinto reduce el riesgo de que el mismo sesgo del generador
   se autoapruebe.

7. **Orquestación y límite de intentos** (`pipeline.ts`) — recorre los fragmentos en round-robin
   pidiendo lotes pequeños (3 preguntas por llamada) hasta alcanzar el número pedido, con un tope
   de intentos (`questionCount × 3`) para no entrar en un bucle si el documento no da para tantas
   preguntas de calidad. Si se agota el presupuesto sin llegar al número pedido, el test se guarda
   igualmente con las preguntas válidas obtenidas — nunca se "rellena" con preguntas dudosas para
   cumplir la cifra. El número de preguntas descartadas se guarda (`Test.discardedCount`) y se
   muestra al usuario, nunca se oculta.

## Proveedores de IA (ver [`lib/ai/provider.ts`](../lib/ai/provider.ts))

| Rol                  | Proveedor | Modelo                  | Por qué                                             |
| -------------------- | --------- | ----------------------- | --------------------------------------------------- |
| Generador            | Groq      | `openai/gpt-oss-120b`   | Gratis sin tarjeta, rápido, buen límite diario      |
| Validador / fallback | Google    | `gemini-3.5-flash-lite` | Gratis sin tarjeta, proveedor distinto al generador |

Toda la lógica del pipeline habla con `getGeneratorModel()` / `getValidatorModel()`, nunca
directamente con los SDKs de Groq o Google — cambiar de proveedor (o añadir uno de pago si algún
día se autoriza explícitamente) es cambiar ese archivo, no reescribir el pipeline. Ver también la
sección "Coste" del README raíz: por defecto Evalia solo usa proveedores de tier gratuito.

## Limitaciones honestas

- **No hay garantía de 0% de error.** El pipeline reduce sustancialmente la tasa de preguntas
  ambiguas o mal fundamentadas frente a un prompt único, pero un modelo puede seguir aceptando algo
  que un humano consideraría mejorable.
- **Deduplicación por palabras, no por significado** (ver punto 5 arriba): dos preguntas pueden
  preguntar básicamente lo mismo con palabras distintas y ambas colarse.
- **Modelos gratuitos, no los más potentes del mercado.** `gpt-oss-120b` y `gemini-3.5-flash-lite`
  son buenos para extracción/verificación grounded en un fragmento corto, pero no al nivel de un
  modelo de frontera de pago en razonamiento complejo (relevante sobre todo en dificultad "alto").
- **OCR de imágenes limitado a texto impreso/escaneado nítido** (`tesseract.js`, local y gratis) —
  texto manuscrito no es fiable.
- **Generación síncrona dentro de la Server Action** que crea el test: para documentos con muchas
  preguntas pedidas, la petición puede tardar uno o dos minutos. A esta escala es aceptable; si el
  proyecto creciera mucho, esto es lo primero que se movería a una cola en background (Vercel
  Queue/Workflow) en vez de bloquear la función.
