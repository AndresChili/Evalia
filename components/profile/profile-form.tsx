"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { updateProfileAction } from "@/lib/actions/auth";
import { updateProfileSchema } from "@/lib/validation/auth";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormValues = z.infer<typeof updateProfileSchema>;

export function ProfileForm({ initialDisplayName }: { initialDisplayName: string }) {
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { displayName: initialDisplayName },
  });

  function onSubmit(values: FormValues) {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateProfileAction(values);
      if (result?.error) {
        setFeedback({ type: "error", text: result.error });
      } else {
        setFeedback({ type: "success", text: "Perfil actualizado." });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {feedback && (
        <Alert variant={feedback.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{feedback.text}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="displayName">Nombre</Label>
        <Input id="displayName" {...register("displayName")} />
        {errors.displayName && (
          <p className="text-destructive text-sm">{errors.displayName.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
