import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Tests guardados" };

const DIFFICULTY_LABEL: Record<string, string> = { LOW: "Bajo", MEDIUM: "Medio", HIGH: "Alto" };

export default async function SavedTestsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const saved = await db.savedTest.findMany({
    where: { userId: session.user.id },
    orderBy: { savedAt: "desc" },
    include: { test: { include: { _count: { select: { questions: true } } } } },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tests guardados</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Tests que has marcado para repetir más adelante.
        </p>
      </div>

      {saved.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No tienes ningún test guardado todavía. Guarda uno desde su página tras generarlo.
        </div>
      ) : (
        <ul className="divide-border border-border divide-y rounded-lg border">
          {saved.map(({ test }) => (
            <li key={test.id} className="px-4 py-3">
              <Link href={`/tests/${test.id}`} className="text-sm font-medium hover:underline">
                {test.title}
              </Link>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {test._count.questions} preguntas · {DIFFICULTY_LABEL[test.difficulty]}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
