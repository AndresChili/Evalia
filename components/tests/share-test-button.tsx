"use client";

import { useState, useTransition } from "react";

import { shareTestAction } from "@/lib/actions/shared-tests";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Friend = { id: string; displayName: string };

export function ShareTestButton({ testId, friends }: { testId: string; friends: Friend[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  function send() {
    if (!selected) return;
    startTransition(async () => {
      const result = await shareTestAction(testId, selected);
      if (result.error) {
        setFeedback({ type: "error", text: result.error });
      } else {
        setFeedback({ type: "success", text: "Test enviado." });
        setSelected("");
      }
    });
  }

  if (friends.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">Añade amigos para poder compartir este test.</p>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Compartir con un amigo
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {feedback && (
        <Alert variant={feedback.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{feedback.text}</AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <Select value={selected} onValueChange={(value) => setSelected(value ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Elige un amigo" />
          </SelectTrigger>
          <SelectContent>
            {friends.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" disabled={!selected || isPending} onClick={send}>
          Enviar
        </Button>
      </div>
    </div>
  );
}
