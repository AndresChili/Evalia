import { generateQuestionBatch } from "@/lib/ai/generate-questions";
import { isDuplicate } from "@/lib/ai/dedupe";
import type { QuestionCandidate } from "@/lib/ai/schemas";
import { shuffle } from "@/lib/ai/shuffle";
import { checkGrounding, hasValidShape, validateWithAI } from "@/lib/ai/validate-question";
import { db } from "@/lib/db";
import type { Difficulty, QuestionType } from "@/lib/generated/prisma/enums";

const QUESTIONS_PER_GENERATION_CALL = 3;
const MAX_ATTEMPT_MULTIPLIER = 3;

type ChunkInput = { id: string; content: string };

type PipelineConfig = {
  questionType: QuestionType;
  optionsCount: number | null;
  questionCount: number;
  difficulty: Difficulty;
};

type AcceptedQuestion = {
  chunkId: string;
  candidate: QuestionCandidate;
};

/**
 * Orquesta todo el pipeline de generación + validación de preguntas para un Test ya creado
 * (status GENERATING). Corre de forma síncrona dentro de la Server Action que la invoca —
 * razonable a esta escala (Vercel Fluid Compute permite funciones de larga duración); si el
 * proyecto creciera mucho, esto es lo primero que se movería a una cola en background.
 */
export async function runGenerationPipeline(testId: string, chunks: ChunkInput[]): Promise<void> {
  const test = await db.test.findUniqueOrThrow({ where: { id: testId } });
  const config: PipelineConfig = {
    questionType: test.questionType,
    optionsCount: test.optionsCount,
    questionCount: test.questionCount,
    difficulty: test.difficulty,
  };

  if (chunks.length === 0) {
    await db.test.update({
      where: { id: testId },
      data: {
        status: "FAILED",
        generationError: "El documento no tiene contenido suficiente para generar preguntas.",
      },
    });
    return;
  }

  const accepted: AcceptedQuestion[] = [];
  let discarded = 0;
  let attempts = 0;
  const maxAttempts = config.questionCount * MAX_ATTEMPT_MULTIPLIER;
  let chunkIndex = 0;

  try {
    while (accepted.length < config.questionCount && attempts < maxAttempts) {
      const chunk = chunks[chunkIndex % chunks.length]!;
      chunkIndex += 1;

      const remaining = config.questionCount - accepted.length;
      const batchSize = Math.min(QUESTIONS_PER_GENERATION_CALL, remaining);

      let batch: QuestionCandidate[];
      try {
        batch = await generateQuestionBatch({
          chunkContent: chunk.content,
          count: batchSize,
          questionType: config.questionType,
          optionsCount: config.optionsCount,
          difficulty: config.difficulty,
        });
      } catch {
        // Fallo de generación en este fragmento (proveedor caído, cuota, etc.) — se cuenta como
        // intentos agotados para este lote y se sigue con el siguiente fragmento.
        attempts += batchSize;
        continue;
      }

      for (const candidate of batch) {
        if (accepted.length >= config.questionCount) break;
        attempts += 1;

        if (!hasValidShape(candidate, config.questionType, config.optionsCount)) {
          discarded += 1;
          continue;
        }
        if (!checkGrounding(candidate, chunk.content)) {
          discarded += 1;
          continue;
        }
        if (
          isDuplicate(
            candidate.prompt,
            accepted.map((a) => a.candidate.prompt),
          )
        ) {
          discarded += 1;
          continue;
        }

        try {
          const { isValid } = await validateWithAI(candidate, chunk.content);
          if (!isValid) {
            discarded += 1;
            continue;
          }
        } catch {
          // El validador falló (proveedor caído/cuota) — ante la duda, descartamos en vez de
          // colar una pregunta sin segunda revisión.
          discarded += 1;
          continue;
        }

        accepted.push({ chunkId: chunk.id, candidate });
      }
    }

    if (accepted.length === 0) {
      await db.test.update({
        where: { id: testId },
        data: {
          status: "FAILED",
          discardedCount: discarded,
          generationError:
            "No se pudo generar ninguna pregunta que superase la validación. Prueba con un documento más extenso o claro, o reduce la dificultad.",
        },
      });
      return;
    }

    await db.$transaction([
      ...accepted.map((item, index) =>
        db.question.create({
          data: {
            testId,
            chunkId: item.chunkId,
            type: config.questionType,
            prompt: item.candidate.prompt,
            explanation: item.candidate.explanation,
            difficulty: config.difficulty,
            sourceQuote: item.candidate.sourceQuote,
            orderIndex: index,
            options: {
              create: shuffle(item.candidate.options).map((option, optionIndex) => ({
                text: option.text,
                isCorrect: option.isCorrect,
                orderIndex: optionIndex,
              })),
            },
          },
        }),
      ),
      db.test.update({
        where: { id: testId },
        data: {
          status: "READY",
          discardedCount: discarded,
          questionCount: accepted.length, // puede ser menor que lo pedido si el contenido no daba para más
        },
      }),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido generando el test.";
    await db.test.update({
      where: { id: testId },
      data: { status: "FAILED", discardedCount: discarded, generationError: message },
    });
  }
}
