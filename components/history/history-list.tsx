"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteAllAttemptsAction, deleteAttemptAction } from "@/lib/actions/attempts";

import { Button } from "@/components/ui/button";

type Attempt = {
  id: string;
  mode: "STUDY" | "EXAM";
  status: string;
  startedAt: Date;
  finalScore: number | string;
  test: { title: string; questionCount: number };
};

export function HistoryList({ attempts }: { attempts: Attempt[] }) {
  const router = useRouter();
  const [items, setItems] = useState(attempts);
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [isPendingAll, startTransitionAll] = useTransition();

  function handleDeleteAll() {
    startTransitionAll(async () => {
      await deleteAllAttemptsAction();
      setItems([]);
      setConfirmingAll(false);
      router.refresh();
    });
  }

  function handleDeleteOne(attemptId: string) {
    setItems((prev) => prev.filter((a) => a.id !== attemptId));
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        Todavía no has realizado ningún test.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        {confirmingAll ? (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">¿Borrar todo el historial?</span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPendingAll}
              onClick={handleDeleteAll}
            >
              Sí, borrar todo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingAll(false)}
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingAll(true)}>
            Borrar todo el historial
          </Button>
        )}
      </div>

      <ul className="divide-border border-border divide-y rounded-lg border">
        {items.map((attempt) => (
          <HistoryRow key={attempt.id} attempt={attempt} onDeleted={handleDeleteOne} />
        ))}
      </ul>
    </div>
  );
}

function HistoryRow({
  attempt,
  onDeleted,
}: {
  attempt: Attempt;
  onDeleted: (attemptId: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteAttemptAction(attempt.id);
      onDeleted(attempt.id);
    });
  }

  return (
    <li className="hover:bg-muted/50 relative flex items-center justify-between gap-4 px-4 py-3">
      {!confirming && (
        <Link
          href={`/attempts/${attempt.id}`}
          className="absolute inset-0"
          aria-label={attempt.test.title}
        />
      )}
      <div className="pointer-events-none min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{attempt.test.title}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {attempt.mode === "STUDY" ? "Estudio" : "Examen"} ·{" "}
          {attempt.startedAt.toLocaleDateString("es-ES")}
          {attempt.status === "IN_PROGRESS" && " · En curso"}
        </p>
      </div>

      <span className="pointer-events-none text-sm font-medium">
        {attempt.status === "COMPLETED"
          ? `${Number(attempt.finalScore).toFixed(2)} / ${attempt.test.questionCount}`
          : "—"}
      </span>

      {confirming ? (
        <div className="relative z-10 flex shrink-0 items-center gap-2">
          <span className="text-muted-foreground text-xs">¿Borrar?</span>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={handleDelete}
          >
            Sí
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            No
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="relative z-10 shrink-0"
          onClick={() => setConfirming(true)}
        >
          Borrar
        </Button>
      )}
    </li>
  );
}
