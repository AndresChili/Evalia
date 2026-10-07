import { generateObject, NoObjectGeneratedError } from "ai";

import { getGeneratorFallbackModel, getGeneratorModel } from "@/lib/ai/provider";
import { questionBatchSchema, type QuestionCandidate } from "@/lib/ai/schemas";
import type { Difficulty, QuestionType } from "@/lib/generated/prisma/enums";

const DIFFICULTY_GUIDANCE: Record<Difficulty, string> = {
  LOW: "Preguntas literales: lo que el texto dice explícitamente, sin necesidad de relacionar conceptos. Los distractores pueden ser claramente incorrectos.",
  MEDIUM:
    "Preguntas que requieren comprender y relacionar dos o más ideas del fragmento, no solo localizar una frase. Los distractores deben ser plausibles y del mismo tema — prohibido que la opción correcta sea obvia a simple vista por descarte rápido de las demás.",
  HIGH: "Preguntas que requieren comparar, aplicar o interpretar conceptos del fragmento — máximo razonamiento posible, pero la respuesta sigue debiendo poder justificarse ÚNICAMENTE con este texto (nada de conocimiento externo aunque sea verdadero). Los distractores deben ser muy plausibles, basados en matices, excepciones o datos reales del propio fragmento mal combinados — nunca inventados ni absurdos. Si una opción incorrecta puede descartarse sin haber leído el fragmento con atención, la pregunta no cumple este nivel.",
};

type GenerateParams = {
  chunkContent: string;
  count: number;
  questionType: QuestionType;
  optionsCount: number | null;
  difficulty: Difficulty;
};

function buildPrompt({
  chunkContent,
  count,
  questionType,
  optionsCount,
  difficulty,
}: GenerateParams): string {
  const typeInstructions =
    questionType === "TRUE_FALSE"
      ? `Genera afirmaciones de Verdadero/Falso. Cada "options" debe tener exactamente 2 elementos: uno con text="Verdadero" y otro con text="Falso", marcando isCorrect en el que corresponda. La afirmación (campo "prompt") debe ser inequívoca: claramente verdadera o claramente falsa según el texto, nunca ambigua ni parcialmente cierta.`
      : `Genera preguntas de alternativa múltiple con exactamente ${optionsCount} opciones cada una. Solo una opción debe tener isCorrect=true. Las opciones incorrectas (distractores) deben ser plausibles y relacionadas con el tema — nunca absurdas ni evidentemente falsas solo por el estilo.`;

  return `Fragmento de apuntes de estudio (fuente única de verdad, en español):
"""
${chunkContent}
"""

Genera ${count} pregunta(s) de examen basadas EXCLUSIVAMENTE en este fragmento.

Reglas estrictas:
- No uses conocimiento externo ni información que no aparezca literalmente en el fragmento.
- No inventes datos, cifras, nombres ni hechos que no estén en el texto.
- Cada pregunta debe tener una única respuesta correcta, sin ambigüedad.
- El campo "sourceQuote" debe ser una cita literal (copia textual exacta) del fragmento que respalda la respuesta — no la parafrasees.
- Dificultad objetivo: ${DIFFICULTY_GUIDANCE[difficulty]}
- ${typeInstructions}
- Si el fragmento no da para ${count} pregunta(s) de calidad sin ambigüedad, genera menos — mejor pocas buenas que muchas dudosas.`;
}

/**
 * Genera un lote de preguntas candidatas para un fragmento. No valida nada todavía —
 * el grounding check y la segunda pasada de validación ocurren después, en el pipeline.
 */
export async function generateQuestionBatch(params: GenerateParams): Promise<QuestionCandidate[]> {
  const prompt = buildPrompt(params);
  const system =
    "Eres un generador de preguntas de examen preciso y conservador. Preferir generar menos preguntas que inventar contenido o forzar ambigüedad.";

  try {
    const { object } = await generateObject({
      model: getGeneratorModel(),
      schema: questionBatchSchema,
      system,
      prompt,
    });
    return object.questions;
  } catch (error) {
    if (error instanceof NoObjectGeneratedError) {
      // El generador principal falló en dar formato válido (o está limitado por cuota) — fallback.
      const { object } = await generateObject({
        model: getGeneratorFallbackModel(),
        schema: questionBatchSchema,
        system,
        prompt,
      });
      return object.questions;
    }
    throw error;
  }
}
