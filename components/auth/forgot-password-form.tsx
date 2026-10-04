"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { requestPasswordResetAction } from "@/lib/actions/auth";
import { forgotPasswordSchema } from "@/lib/validation/auth";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  function onSubmit(values: ForgotPasswordValues) {
    setMessage(null);
    startTransition(async () => {
      const result = await requestPasswordResetAction(values);
      setMessage(result.message ?? result.error ?? null);
    });
  }

  if (message) {
    return (
      <div className="flex flex-col gap-4">
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        <Link
          href="/login"
          className="text-foreground text-center text-sm font-medium hover:underline"
        >
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
      </div>

      <Button type="submit" disabled={isPending} className="mt-2">
        {isPending ? "Enviando…" : "Enviar enlace de recuperación"}
      </Button>

      <Link href="/login" className="text-muted-foreground text-center text-sm hover:underline">
        Volver a iniciar sesión
      </Link>
    </form>
  );
}
