import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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

      {attempts.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Todavía no has realizado ningún test.
        </div>
      ) : (
        <ul className="divide-border border-border divide-y rounded-lg border">
          {attempts.map((attempt) => (
            <li key={attempt.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <Link
                  href={`/attempts/${attempt.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {attempt.test.title}
                </Link>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {attempt.mode === "STUDY" ? "Estudio" : "Examen"} ·{" "}
                  {attempt.startedAt.toLocaleDateString("es-ES")}
                  {attempt.status === "IN_PROGRESS" && " · En curso"}
                </p>
              </div>
              <span className="text-sm font-medium">
                {attempt.status === "COMPLETED"
                  ? `${Number(attempt.finalScore).toFixed(2)} / ${attempt.test.questionCount}`
                  : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
