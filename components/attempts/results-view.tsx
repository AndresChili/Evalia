import Link from "next/link";

import { Button } from "@/components/ui/button";

type QuestionReview = {
  id: string;
  prompt: string;
  explanation: string | null;
  options: { id: string; text: string; isCorrect: boolean }[];
  selectedOptionId: string | null;
  status: "correct" | "incorrect" | "unanswered";
};

type ResultsViewProps = {
  testTitle: string;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  totalQuestions: number;
  rawScore: number;
  penaltyApplied: number;
  finalScore: number;
  questions: QuestionReview[];
};

const STATUS_LABEL: Record<QuestionReview["status"], string> = {
  correct: "Correcta",
  incorrect: "Incorrecta",
  unanswered: "Sin contestar",
};

const STATUS_CLASS: Record<QuestionReview["status"], string> = {
  correct: "text-emerald-700 dark:text-emerald-400",
  incorrect: "text-destructive",
  unanswered: "text-muted-foreground",
};

export function ResultsView({
  testTitle,
  correctCount,
  incorrectCount,
  unansweredCount,
  totalQuestions,
  rawScore,
  penaltyApplied,
  finalScore,
  questions,
}: ResultsViewProps) {
  const accuracyPct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{testTitle}</h1>
        <p className="text-muted-foreground mt-1 text-sm">Resultados</p>
      </div>

      <div className="border-border grid grid-cols-2 gap-4 rounded-lg border p-6 sm:grid-cols-4">
        <Stat label="Puntuación" value={finalScore.toFixed(2)} />
        <Stat label="Acierto" value={`${accuracyPct}%`} />
        <Stat
          label="Correctas"
          value={String(correctCount)}
          className="text-emerald-700 dark:text-emerald-400"
        />
        <Stat label="Incorrectas" value={String(incorrectCount)} className="text-destructive" />
        <Stat label="Sin contestar" value={String(unansweredCount)} />
        <Stat label="Total preguntas" value={String(totalQuestions)} />
        <Stat label="Nota sin penalizar" value={rawScore.toFixed(2)} />
        <Stat label="Penalización aplicada" value={`-${penaltyApplied.toFixed(2)}`} />
      </div>

      <div className="flex gap-3">
        <Button render={<Link href="/dashboard" />}>Volver al dashboard</Button>
        <Button render={<Link href="/tests/new" />} variant="outline">
          Crear otro test
        </Button>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium">Revisión</h2>
        <ol className="flex flex-col gap-6">
          {questions.map((q, i) => (
            <li key={q.id} className="border-border rounded-lg border p-4">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium">
                  {i + 1}. {q.prompt}
                </p>
                <span className={`shrink-0 text-xs font-medium ${STATUS_CLASS[q.status]}`}>
                  {STATUS_LABEL[q.status]}
                </span>
              </div>
              <ul className="mt-3 flex flex-col gap-1.5">
                {q.options.map((option) => {
                  const wasSelected = option.id === q.selectedOptionId;
                  return (
                    <li
                      key={option.id}
                      className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm ${
                        option.isCorrect
                          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : wasSelected
                            ? "bg-destructive/10 text-destructive"
                            : "text-muted-foreground"
                      }`}
                    >
                      {option.isCorrect ? "✓" : wasSelected ? "✗" : "○"} {option.text}
                      {wasSelected && !option.isCorrect && (
                        <span className="text-xs italic">(tu respuesta)</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {q.explanation && (
                <p className="text-muted-foreground mt-3 text-xs">{q.explanation}</p>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <p className={`text-xl font-semibold tracking-tight ${className ?? ""}`}>{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}
