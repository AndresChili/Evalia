"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { toggleSaveTestAction } from "@/lib/actions/saved-tests";

import { Button } from "@/components/ui/button";

export function SaveTestButton({
  testId,
  initialSaved,
}: {
  testId: string;
  initialSaved: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await toggleSaveTestAction(testId);
      if (typeof result.saved === "boolean") {
        setSaved(result.saved);
        router.refresh();
      }
    });
  }

  return (
    <Button type="button" variant="outline" disabled={isPending} onClick={toggle}>
      {saved ? "★ Guardado" : "☆ Guardar test"}
    </Button>
  );
}
