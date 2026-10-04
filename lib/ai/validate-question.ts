import { generateObject } from "ai";

import { getValidatorModel } from "@/lib/ai/provider";
import { isGrounded } from "@/lib/ai/grounding";
import { validationResultSchema, type QuestionCandidate } from "@/lib/ai/schemas";
import type { QuestionType } from "@/lib/generated/prisma/enums";

export type RejectionReason =
  "malformed_options" | "not_grounded" | "ai_validation_failed" | "duplicate";

/**
 * Validación estructural: forma correcta sin necesidad de IA (gratis, instantáneo).
 * Se comprueba antes del grounding/IA para descartar candidatos rotos sin gastar llamadas.
 */
export function hasValidShape(
  candidate: QuestionCandidate,
  questionType: QuestionType,
  expectedOptionsCount: number | null,
): boolean {
  const correctCount = candidate.options.filter((o) => o.isCorrect).length;
  if (correctCount !== 1) return false;

  if (questionType === "TRUE_FALSE") {
    if (candidate.options.length !== 2) return false;
    const texts = candidate.options.map((o) => o.text.trim().toLowerCase());
    return texts.includes("verdadero") && texts.includes("falso");
  }

  if (expectedOptionsCount && candidate.options.length !== expectedOptionsCount) return false;

  // Sin distractores duplicados entre sí (opción repetida literalmente dos veces).
  const uniqueTexts = new Set(candidate.options.map((o) => o.text.trim().toLowerCase()));
  return uniqueTexts.size === candidate.options.length;
}

/** Paso 1 del control de calidad: la cita existe de verdad en el fragmento origen. */
export function checkGrounding(candidate: QuestionCandidate, chunkContent: string): boolean {
  return isGrounded(candidate.sourceQuote, chunkContent);
}

/**
 * Paso 2: segunda pasada de IA, con un proveedor distinto al generador, actuando de revisor:
 * ¿es ambigua? ¿hay una sola respuesta correcta clara? ¿la cita respalda de verdad esa respuesta?
 */
export async function validateWithAI(
  candidate: QuestionCandidate,
  chunkContent: string,
): Promise<{ isValid: boolean; reason: string }> {
  const prompt = `Fragmento original:
"""
${chunkContent}
"""

Pregunta generada a revisar:
- Enunciado: ${candidate.prompt}
- Opciones: ${candidate.options.map((o) => `${o.isCorrect ? "[CORRECTA] " : ""}${o.text}`).join(" | ")}
- Cita que supuestamente respalda la respuesta: "${candidate.sourceQuote}"

Evalúa como revisor estricto: ¿la pregunta es inequívoca, tiene una única respuesta correcta, y esa respuesta está realmente respaldada por el fragmento (no por conocimiento externo)? Marca isValid=false si hay cualquier ambigüedad, si la cita no respalda realmente la respuesta marcada como correcta, o si una opción incorrecta también podría defenderse como correcta con el texto dado.`;

  const { object } = await generateObject({
    model: getValidatorModel(),
    schema: validationResultSchema,
    system:
      "Eres un revisor de calidad estricto y escéptico de preguntas de examen. Ante la duda, rechaza.",
    prompt,
  });

  return object;
}
