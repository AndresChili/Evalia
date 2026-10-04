import Link from "next/link";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [recentTests, savedCount, recentAttempts] = await Promise.all([
    db.test.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, status: true, questionCount: true, createdAt: true },
    }),
    db.savedTest.count({ where: { userId: session.user.id } }),
    db.testAttempt.findMany({
      where: { userId: session.user.id, status: "COMPLETED" },
      orderBy: { finishedAt: "desc" },
      take: 5,
      include: { test: { select: { title: true, questionCount: true } } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola, {session.user.name ?? session.user.email}
        </h1>
        <p className="text-muted-foreground mt-1">¿Qué quieres hacer?</p>
      </div>

      <div className="flex gap-3">
        <Button render={<Link href="/tests/new" />}>Crear test</Button>
        <Button render={<Link href="/documents" />} variant="outline">
          Documentos
        </Button>
        <Button render={<Link href="/saved" />} variant="outline">
          Guardados {savedCount > 0 && `(${savedCount})`}
        </Button>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium">Tests recientes</h2>
          {recentTests.length > 0 && (
            <Link href="/history" className="text-muted-foreground text-xs hover:underline">
              Ver historial
            </Link>
          )}
        </div>
        {recentTests.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Todavía no has creado ningún test —{" "}
            <Link href="/tests/new" className="underline">
              crea el primero
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-border border-border divide-y rounded-lg border">
            {recentTests.map((test) => (
              <li key={test.id} className="px-4 py-3">
                <Link href={`/tests/${test.id}`} className="text-sm font-medium hover:underline">
                  {test.title}
                </Link>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {test.status === "GENERATING"
                    ? "Generando…"
                    : test.status === "FAILED"
                      ? "Falló la generación"
                      : `${test.questionCount} preguntas`}{" "}
                  · {test.createdAt.toLocaleDateString("es-ES")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {recentAttempts.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium">Actividad reciente</h2>
          <ul className="divide-border border-border divide-y rounded-lg border">
            {recentAttempts.map((attempt) => (
              <li key={attempt.id} className="flex items-center justify-between px-4 py-3">
                <Link href={`/attempts/${attempt.id}`} className="text-sm hover:underline">
                  {attempt.test.title}
                </Link>
                <span className="text-muted-foreground text-xs">
                  {Number(attempt.finalScore).toFixed(2)} / {attempt.test.questionCount}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
