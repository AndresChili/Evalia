"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { respondToFriendRequestAction } from "@/lib/actions/friends";

import { Button } from "@/components/ui/button";

type Request = { id: string; displayName: string };

export function FriendRequestList({ requests }: { requests: Request[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function respond(requestId: string, accept: boolean) {
    setPendingId(requestId);
    startTransition(async () => {
      await respondToFriendRequestAction(requestId, accept);
      router.refresh();
      setPendingId(null);
    });
  }

  if (requests.length === 0) {
    return <p className="text-muted-foreground text-sm">No tienes solicitudes pendientes.</p>;
  }

  return (
    <ul className="divide-border border-border divide-y rounded-lg border">
      {requests.map((r) => (
        <li key={r.id} className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium">{r.displayName}</span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pendingId === r.id}
              onClick={() => respond(r.id, true)}
            >
              Aceptar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pendingId === r.id}
              onClick={() => respond(r.id, false)}
            >
              Rechazar
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
