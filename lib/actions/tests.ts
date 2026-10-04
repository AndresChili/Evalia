"use server";

import { runGenerationPipeline } from "@/lib/ai/pipeline";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isRateLimited, testGenerationRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { createTestConfigSchema } from "@/lib/validation/tests";

type ActionResult = { error?: string; testId?: string };

export async function createTestAction(input: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado." };

  const parsed = createTestConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Configuración inválida." };
  }
  const config = parsed.data;

  const ip = await getClientIp();
  if (await isRateLimited(testGenerationRateLimiter, `test-gen:${session.user.id}:${ip}`)) {
    return { error: "Demasiados tests generados en poco tiempo. Prueba de nuevo en un rato." };
  }

  const document = await db.document.findUnique({
    where: { id: config.documentId },
    include: { chunks: { orderBy: { index: "asc" } } },
  });
  if (!document || document.userId !== session.user.id) {
    return { error: "Documento no encontrado." };
  }
  if (document.status !== "READY") {
    return { error: "El documento todavía no está listo (o falló al procesarse)." };
  }
  if (document.chunks.length === 0) {
    return { error: "El documento no tiene contenido del que generar preguntas." };
  }

  const test = await db.test.create({
    data: {
      userId: session.user.id,
      documentId: document.id,
      title: config.title,
      questionType: config.questionType,
      optionsCount:
        config.questionType === "MULTIPLE_CHOICE" ? (config.optionsCount ?? null) : null,
      questionCount: config.questionCount,
      difficulty: config.difficulty,
      scoringType: config.scoringType,
      penaltyValue: config.scoringType === "CUSTOM_PENALTY" ? config.penaltyValue : null,
      penaltyGroupSize: config.scoringType === "GROUPED_PENALTY" ? config.penaltyGroupSize : null,
      status: "GENERATING",
    },
  });

  // Síncrono dentro de la Server Action (ver nota en lib/ai/pipeline.ts). El cliente ve el
  // estado "generando" vía polling/refresh de la página del test mientras esto corre.
  await runGenerationPipeline(
    test.id,
    document.chunks.map((c) => ({ id: c.id, content: c.content })),
  );

  return { testId: test.id };
}
