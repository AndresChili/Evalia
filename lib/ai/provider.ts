import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";

/**
 * Capa de abstracción de proveedor de IA. Todo lo demás en lib/ai/* habla con esta interfaz,
 * nunca directamente con @ai-sdk/groq o @ai-sdk/google — cambiar de proveedor es cambiar
 * este archivo, no el pipeline.
 *
 * Por defecto usamos solo proveedores con tier gratuito sin tarjeta (Groq + Gemini). Ver
 * memoria del proyecto / README sección "Coste": no se activa ningún proveedor de pago sin
 * autorización explícita.
 */

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

/** Modelo generador: flagship gratuito de Groq, buen límite diario. */
export function getGeneratorModel(): LanguageModel {
  return groq("openai/gpt-oss-120b");
}

/** Modelo validador: deliberadamente otro proveedor que el generador — reduce el riesgo de
 * que el mismo sesgo/alucinación del generador "se autoapruebe" en la segunda pasada. */
export function getValidatorModel(): LanguageModel {
  return google("gemini-3.5-flash-lite");
}

/** Fallback del generador si Groq falla/está limitado por cuota. */
export function getGeneratorFallbackModel(): LanguageModel {
  return google("gemini-3.5-flash-lite");
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly cause: unknown,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
