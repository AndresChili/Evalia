import { z } from "zod";

export const candidateOptionSchema = z.object({
  text: z.string().min(1).max(300),
  isCorrect: z.boolean(),
});

export const questionCandidateSchema = z.object({
  prompt: z.string().min(10).max(500).describe("El enunciado de la pregunta, en español."),
  sourceQuote: z
    .string()
    .min(5)
    .max(600)
    .describe(
      "Cita literal y textual (copia exacta, sin parafrasear) del fragmento que respalda la respuesta correcta.",
    ),
  explanation: z
    .string()
    .min(5)
    .max(400)
    .describe(
      "Explicación breve de por qué esa es la respuesta correcta, basada solo en el texto.",
    ),
  options: z
    .array(candidateOptionSchema)
    .min(2)
    .max(6)
    .describe("Opciones de respuesta. Exactamente una debe tener isCorrect=true."),
});
export type QuestionCandidate = z.infer<typeof questionCandidateSchema>;

export const questionBatchSchema = z.object({
  questions: z.array(questionCandidateSchema),
});

export const validationResultSchema = z.object({
  isValid: z
    .boolean()
    .describe(
      "true solo si la pregunta es inequívoca, tiene una única respuesta correcta clara, y esa respuesta está respaldada por el texto citado.",
    ),
  reason: z
    .string()
    .max(300)
    .describe("Motivo breve, especialmente si isValid=false: qué falla concretamente."),
});
export type ValidationResult = z.infer<typeof validationResultSchema>;
