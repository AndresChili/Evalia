"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type ActionResult = { error?: string; saved?: boolean };

export async function toggleSaveTestAction(testId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado." };

  const test = await db.test.findUnique({ where: { id: testId } });
  if (!test || test.userId !== session.user.id) return { error: "Test no encontrado." };

  const existing = await db.savedTest.findUnique({
    where: { userId_testId: { userId: session.user.id, testId } },
  });

  if (existing) {
    await db.savedTest.delete({ where: { id: existing.id } });
    return { saved: false };
  }

  await db.savedTest.create({ data: { userId: session.user.id, testId } });
  return { saved: true };
}
