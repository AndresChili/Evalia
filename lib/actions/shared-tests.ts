"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function areFriends(userId: string, otherUserId: string): Promise<boolean> {
  const [userAId, userBId] = userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];
  const friendship = await db.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });
  return !!friendship;
}

export async function shareTestAction(
  testId: string,
  toUserId: string,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado." };

  const test = await db.test.findUnique({ where: { id: testId } });
  if (!test || test.userId !== session.user.id) return { error: "Test no encontrado." };
  if (test.status !== "READY") return { error: "Solo puedes compartir un test ya generado." };

  if (!(await areFriends(session.user.id, toUserId))) {
    return { error: "Solo puedes enviar tests a tus amigos." };
  }

  const alreadySent = await db.sharedTest.findFirst({
    where: { testId, toUserId, status: "PENDING" },
  });
  if (alreadySent) return { error: "Ya le has enviado este test — está pendiente de respuesta." };

  await db.sharedTest.create({ data: { testId, fromUserId: session.user.id, toUserId } });

  await db.notification.create({
    data: {
      userId: toUserId,
      type: "TEST_SHARED",
      payload: { testId, fromUserId: session.user.id, testTitle: test.title },
    },
  });

  return {};
}

export async function respondToSharedTestAction(
  sharedTestId: string,
  accept: boolean,
): Promise<{ error?: string; newTestId?: string }> {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado." };

  const shared = await db.sharedTest.findUnique({
    where: { id: sharedTestId },
    include: { test: { include: { questions: { include: { options: true } } } } },
  });
  if (!shared || shared.toUserId !== session.user.id) return { error: "No encontrado." };
  if (shared.status !== "PENDING") return { error: "Ya se respondió a este envío." };

  if (!accept) {
    await db.sharedTest.update({
      where: { id: shared.id },
      data: { status: "DECLINED", respondedAt: new Date() },
    });
    return {};
  }

  // Se clona el test entero (preguntas + opciones) como una copia propia e independiente del
  // receptor — nunca referencia el Document original (es del remitente, no se comparte).
  const newTest = await db.test.create({
    data: {
      userId: session.user.id,
      title: shared.test.title,
      questionType: shared.test.questionType,
      optionsCount: shared.test.optionsCount,
      questionCount: shared.test.questionCount,
      difficulty: shared.test.difficulty,
      scoringType: shared.test.scoringType,
      penaltyValue: shared.test.penaltyValue,
      penaltyGroupSize: shared.test.penaltyGroupSize,
      status: "READY",
      originTestId: shared.test.id,
      questions: {
        create: shared.test.questions.map((q) => ({
          type: q.type,
          prompt: q.prompt,
          explanation: q.explanation,
          difficulty: q.difficulty,
          sourceQuote: q.sourceQuote,
          orderIndex: q.orderIndex,
          options: {
            create: q.options.map((o) => ({
              text: o.text,
              isCorrect: o.isCorrect,
              orderIndex: o.orderIndex,
            })),
          },
        })),
      },
    },
  });

  await db.$transaction([
    db.sharedTest.update({
      where: { id: shared.id },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    }),
    db.savedTest.create({ data: { userId: session.user.id, testId: newTest.id } }),
  ]);

  return { newTestId: newTest.id };
}
