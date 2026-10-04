"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { finishAttemptAction, submitAnswerAction } from "@/lib/actions/attempts";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type ClientOption = { id: string; text: string };
type ClientQuestion = {
  id: string;
  prompt: string;
  options: ClientOption[];
  selectedOptionId: string | null;
  revealed: { correctOptionId: string; isCorrect: boolean; explanation: string | null } | null;
};

type Props = {
  attemptId: string;
  mode: "STUDY" | "EXAM";
  initialQuestions: ClientQuestion[];
};

export function TestTakingView({ attemptId, mode, initialQuestions }: Props) {
  const router = useRouter();
  const [questions, setQuestions] = useState(initialQuestions);
  const [confirmingFinish, setConfirmingFinish] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingQuestionId, setPendingQuestionId] = useState<string | null>(null);
  const [isFinishing, startFinishTransition] = useTransition();

  const answeredCount = questions.filter((q) => q.selectedOptionId !== null).length;
  const unansweredCount = questions.length - answeredCount;

  function selectOption(questionId: string, optionId: string) {
    const question = questions.find((q) => q.id === questionId);
    if (!question || question.revealed) return; // bloqueada tras revelar feedback en modo estudio

    setError(null);
    setPendingQuestionId(questionId);
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, selectedOptionId: optionId } : q)),
    );

    submitAnswerAction({ attemptId, questionId, selectedOptionId: optionId })
      .then((result) => {
        if ("error" in result) {
          setError(result.error);
          return;
        }
        if (result.feedback) {
          setQuestions((prev) =>
            prev.map((q) => (q.id === questionId ? { ...q, revealed: result.feedback } : q)),
          );
        }
      })
      .finally(() => setPendingQuestionId(null));
  }

  function finish() {
    startFinishTransition(async () => {
      const result = await finishAttemptAction({ attemptId });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="bg-background/80 sticky top-0 z-10 flex items-center justify-between border-b py-3 backdrop-blur">
        <p className="text-sm font-medium">
          {answeredCount} / {questions.length} contestadas
        </p>
        <span className="text-muted-foreground text-xs">
          {mode === "STUDY" ? "Modo estudio" : "Modo examen"}
        </span>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <ol className="flex flex-col gap-6">
        {questions.map((q, i) => (
          <li key={q.id} className="border-border rounded-lg border p-4">
            <p className="text-sm font-medium">
              {i + 1}. {q.prompt}
            </p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {q.options.map((option) => {
                const isSelected = option.id === q.selectedOptionId;
                const revealCorrect = q.revealed && option.id === q.revealed.correctOptionId;
                const revealWrongSelected = q.revealed && isSelected && !q.revealed.isCorrect;

                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      disabled={!!q.revealed || pendingQuestionId === q.id}
                      onClick={() => selectOption(q.id, option.id)}
                      className={`w-full rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors disabled:cursor-default ${
                        revealCorrect
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : revealWrongSelected
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : isSelected
                              ? "border-foreground bg-muted"
                              : "border-border hover:bg-muted"
                      }`}
                    >
                      {option.text}
                    </button>
                  </li>
                );
              })}
            </ul>
            {q.revealed && (
              <p
                className={`mt-2 text-xs font-medium ${q.revealed.isCorrect ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}
              >
                {q.revealed.isCorrect ? "Correcto." : "Incorrecto."} {q.revealed.explanation}
              </p>
            )}
          </li>
        ))}
      </ol>

      <div className="sticky bottom-4 flex flex-col items-center gap-2">
        {confirmingFinish ? (
          <div className="border-border bg-background flex flex-col items-center gap-2 rounded-lg border p-4 shadow-sm">
            <p className="text-sm">
              Tienes {unansweredCount} pregunta{unansweredCount === 1 ? "" : "s"} sin contestar.
              ¿Finalizar igualmente?
            </p>
            <div className="flex gap-2">
              <Button type="button" disabled={isFinishing} onClick={finish}>
                Sí, finalizar
              </Button>
              <Button type="button" variant="outline" onClick={() => setConfirmingFinish(false)}>
                Seguir respondiendo
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            disabled={isFinishing}
            onClick={() => (unansweredCount > 0 ? setConfirmingFinish(true) : finish())}
          >
            {isFinishing ? "Finalizando…" : "Finalizar test"}
          </Button>
        )}
      </div>
    </div>
  );
}
