import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

import { HistoryList } from "@/components/history/history-list";

export const metadata: Metadata = { title: "Historial" };

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const attempts = await db.testAttempt.findMany({
    where: { userId: session.user.id },
    orderBy: { startedAt: "desc" },
    include: { test: { select: { title: true, questionCount: true } } },
    take: 50,
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Historial</h1>
        <p className="text-muted-foreground mt-1 text-sm">Tests que has realizado.</p>
      </div>

      <HistoryList
        attempts={attempts.map((a) => ({ ...a, finalScore: a.finalScore.toString() }))}
      />
    </div>
  );
}
