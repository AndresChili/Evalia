"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { respondToSharedTestAction } from "@/lib/actions/shared-tests";

import { Button } from "@/components/ui/button";

type Pending = { id: string; testTitle: string; fromDisplayName: string };

export function ReceivedTestList({ pending }: { pending: Pending[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function respond(sharedTestId: string, accept: boolean) {
    setPendingId(sharedTestId);
    startTransition(async () => {
      const result = await respondToSharedTestAction(sharedTestId, accept);
      router.refresh();
      setPendingId(null);
      if (accept && result.newTestId) router.push(`/tests/${result.newTestId}`);
    });
  }

  if (pending.length === 0) {
    return <p className="text-muted-foreground text-sm">No tienes tests pendientes de aceptar.</p>;
  }

  return (
    <ul className="divide-border border-border divide-y rounded-lg border">
      {pending.map((p) => (
        <li key={p.id} className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium">{p.testTitle}</p>
            <p className="text-muted-foreground text-xs">de {p.fromDisplayName}</p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pendingId === p.id}
              onClick={() => respond(p.id, true)}
            >
              Aceptar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pendingId === p.id}
              onClick={() => respond(p.id, false)}
            >
              Rechazar
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
