"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  searchUsersAction,
  sendFriendRequestAction,
  type UserSearchResult,
} from "@/lib/actions/friends";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const RELATION_LABEL: Record<UserSearchResult["relation"], string> = {
  friends: "Ya sois amigos",
  request_sent: "Solicitud enviada",
  request_received: "Te ha enviado una solicitud",
  none: "",
};

export function FriendSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, startSearchTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startSearchTransition(async () => {
      const result = await searchUsersAction(query);
      if (result.error) {
        setError(result.error);
        return;
      }
      setResults(result.results ?? []);
    });
  }

  function sendRequest(userId: string) {
    setPendingId(userId);
    sendFriendRequestAction(userId)
      .then((result) => {
        if (result.error) {
          setError(result.error);
          return;
        }
        setResults(
          (prev) =>
            prev?.map((r) => (r.id === userId ? { ...r, relation: "request_sent" } : r)) ?? null,
        );
        router.refresh();
      })
      .finally(() => setPendingId(null));
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca por nombre o email exacto"
          className="flex-1"
        />
        <Button type="submit" disabled={isSearching}>
          Buscar
        </Button>
      </form>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {results !== null &&
        (results.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin resultados.</p>
        ) : (
          <ul className="divide-border border-border divide-y rounded-lg border">
            {results.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium">{r.displayName}</span>
                {r.relation === "none" ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={pendingId === r.id}
                    onClick={() => sendRequest(r.id)}
                  >
                    Enviar solicitud
                  </Button>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    {RELATION_LABEL[r.relation]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
