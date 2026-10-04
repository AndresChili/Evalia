"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { startAttemptAction } from "@/lib/actions/attempts";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function StartAttemptButtons({ testId }: { testId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function start(mode: "STUDY" | "EXAM") {
    setError(null);
    startTransition(async () => {
      const result = await startAttemptAction({ testId, mode });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(`/attempts/${result.attemptId}`);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex gap-3">
        <Button type="button" disabled={isPending} onClick={() => start("STUDY")}>
          Modo estudio
        </Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={() => start("EXAM")}>
          Modo examen
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Estudio: ves si aciertas al momento. Examen: corrección al final, sin pistas mientras
        respondes.
      </p>
    </div>
  );
}
