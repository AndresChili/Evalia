import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { StartAttemptButtons } from "@/components/tests/start-attempt-buttons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Test generado" };

const DIFFICULTY_LABEL: Record<string, string> = { LOW: "Bajo", MEDIUM: "Medio", HIGH: "Alto" };

type Props = { params: Promise<{ id: string }> };

export default async function TestReviewPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const test = await db.test.findUnique({
    where: { id },
    include: {
      questions: { include: { options: true }, orderBy: { orderIndex: "asc" } },
      attempts: {
        where: { userId: session.user.id, status: "COMPLETED" },
        orderBy: { finishedAt: "desc" },
        take: 5,
      },
    },
  });

  if (!test || test.userId !== session.user.id) notFound();

  if (test.status === "FAILED") {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{test.title}</h1>
        <Alert variant="destructive">
          <AlertDescription>
            {test.generationError ?? "No se pudo generar el test."}
          </AlertDescription>
        </Alert>
        <Button render={<Link href="/tests/new" />} className="w-fit">
          Volver a intentar
        </Button>
      </div>
    );
  }

  if (test.status === "GENERATING") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 py-16 text-center">
        <div className="border-muted-foreground/30 border-t-foreground size-6 animate-spin rounded-full border-2" />
        <p className="text-sm font-medium">Todavía generando este test…</p>
        <p className="text-muted-foreground text-xs">Recarga la página en un momento.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{test.title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {test.questions.length} pregunta{test.questions.length === 1 ? "" : "s"} ·{" "}
          {DIFFICULTY_LABEL[test.difficulty]}
          {test.discardedCount > 0 &&
            ` · ${test.discardedCount} descartada${test.discardedCount === 1 ? "" : "s"} por no superar la validación`}
        </p>
      </div>

      <StartAttemptButtons testId={test.id} />

      {test.attempts.length > 0 && (
        <div>
          <h2 className="text-muted-foreground mb-2 text-sm font-medium">Intentos anteriores</h2>
          <ul className="flex flex-col gap-1">
            {test.attempts.map((attempt) => (
              <li key={attempt.id} className="text-sm">
                <Link href={`/attempts/${attempt.id}`} className="hover:underline">
                  {Number(attempt.finalScore).toFixed(2)} puntos ·{" "}
                  {attempt.mode === "STUDY" ? "estudio" : "examen"} ·{" "}
                  {attempt.finishedAt?.toLocaleDateString("es-ES")}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="text-muted-foreground mb-3 text-sm font-medium">
          Preguntas incluidas (sin mostrar respuestas, para no estropear el test)
        </h2>
        <ol className="flex flex-col gap-2">
          {test.questions.map((question, i) => (
            <li key={question.id} className="text-muted-foreground text-sm">
              {i + 1}. {question.prompt}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
