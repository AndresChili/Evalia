"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateScore } from "@/lib/scoring/calculate-score";
import { tallyAttempt } from "@/lib/scoring/tally-attempt";
import {
  finishAttemptSchema,
  startAttemptSchema,
  submitAnswerSchema,
} from "@/lib/validation/attempts";

type ActionResult = { error?: string; attemptId?: string };
type AnswerResult =
  | { error: string }
  | { ok: true; feedback: null } // modo examen: no se revela nada
  | {
      ok: true;
      feedback: { isCorrect: boolean; correctOptionId: string; explanation: string | null };
    };

export async function startAttemptAction(input: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado." };

  const parsed = startAttemptSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  const test = await db.test.findUnique({ where: { id: parsed.data.testId } });
  if (!test || test.userId !== session.user.id) return { error: "Test no encontrado." };
  if (test.status !== "READY") return { error: "Este test todavía no está listo." };

  const attempt = await db.testAttempt.create({
    data: { testId: test.id, userId: session.user.id, mode: parsed.data.mode },
  });

  return { attemptId: attempt.id };
}

export async function submitAnswerAction(input: unknown): Promise<AnswerResult> {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado." };

  const parsed = submitAnswerSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };
  const { attemptId, questionId, selectedOptionId } = parsed.data;

  const attempt = await db.testAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.userId !== session.user.id) return { error: "Intento no encontrado." };
  if (attempt.status !== "IN_PROGRESS") return { error: "Este intento ya ha terminado." };

  const question = await db.question.findUnique({
    where: { id: questionId },
    include: { options: true },
  });
  if (!question || question.testId !== attempt.testId) return { error: "Pregunta no encontrada." };

  let isCorrect: boolean | null = null;
  let correctOptionId: string | null = null;

  if (selectedOptionId) {
    const selectedOption = question.options.find((o) => o.id === selectedOptionId);
    if (!selectedOption) return { error: "Opción no válida." };
    isCorrect = selectedOption.isCorrect;
  }
  const correctOption = question.options.find((o) => o.isCorrect);
  correctOptionId = correctOption?.id ?? null;

  await db.userAnswer.upsert({
    where: { attemptId_questionId: { attemptId, questionId } },
    create: { attemptId, questionId, selectedOptionId, isCorrect },
    update: { selectedOptionId, isCorrect, answeredAt: new Date() },
  });

  // En modo examen nunca se devuelve si acertó ni cuál era la correcta, ni aunque el cliente
  // no fuera a mostrarlo — no se manda la info sensible por la red en primer lugar.
  if (attempt.mode === "EXAM") return { ok: true, feedback: null };

  return {
    ok: true,
    feedback: {
      isCorrect: isCorrect ?? false,
      correctOptionId: correctOptionId!,
      explanation: question.explanation,
    },
  };
}

export async function finishAttemptAction(input: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado." };

  const parsed = finishAttemptSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  const attempt = await db.testAttempt.findUnique({
    where: { id: parsed.data.attemptId },
    include: { answers: true, test: { include: { questions: true } } },
  });
  if (!attempt || attempt.userId !== session.user.id) return { error: "Intento no encontrado." };
  if (attempt.status !== "IN_PROGRESS") return { attemptId: attempt.id }; // idempotente: ya estaba terminado

  const { correctCount, incorrectCount, unansweredCount } = tallyAttempt(
    attempt.test.questions.map((q) => q.id),
    attempt.answers,
  );

  const { rawScore, penaltyApplied, finalScore } = calculateScore({
    correctCount,
    incorrectCount,
    scoringType: attempt.test.scoringType,
    penaltyValue: attempt.test.penaltyValue,
    penaltyGroupSize: attempt.test.penaltyGroupSize,
  });

  await db.testAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "COMPLETED",
      finishedAt: new Date(),
      correctCount,
      incorrectCount,
      unansweredCount,
      rawScore: rawScore.toNumber(),
      penaltyApplied: penaltyApplied.toNumber(),
      finalScore: finalScore.toNumber(),
    },
  });

  return { attemptId: attempt.id };
}
