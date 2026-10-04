import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Recupera tu contraseña</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Te enviaremos un enlace para elegir una nueva.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
