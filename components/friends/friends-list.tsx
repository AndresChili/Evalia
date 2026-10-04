"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { removeFriendAction } from "@/lib/actions/friends";

import { Button } from "@/components/ui/button";

type Friend = { id: string; displayName: string };

export function FriendsList({ friends }: { friends: Friend[] }) {
  const router = useRouter();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function remove(friendId: string) {
    setPendingId(friendId);
    startTransition(async () => {
      await removeFriendAction(friendId);
      router.refresh();
      setPendingId(null);
      setConfirmingId(null);
    });
  }

  if (friends.length === 0) {
    return <p className="text-muted-foreground text-sm">Todavía no tienes amigos añadidos.</p>;
  }

  return (
    <ul className="divide-border border-border divide-y rounded-lg border">
      {friends.map((f) => (
        <li key={f.id} className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium">{f.displayName}</span>
          {confirmingId === f.id ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">¿Eliminar?</span>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={pendingId === f.id}
                onClick={() => remove(f.id)}
              >
                Sí
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmingId(null)}>
                No
              </Button>
            </div>
          ) : (
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmingId(f.id)}>
              Eliminar
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
