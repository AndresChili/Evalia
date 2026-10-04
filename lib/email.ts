import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!resend) {
    // Sin Resend configurado (desarrollo local): dejamos el enlace en consola para poder probar el flujo.
    console.warn(`[email] RESEND_API_KEY no configurado. Enlace de recuperación para ${to}:`);
    console.warn(resetUrl);
    return;
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Evalia <no-reply@evalia.app>",
    to,
    subject: "Recupera tu contraseña — Evalia",
    html: `
      <p>Has solicitado restablecer tu contraseña en Evalia.</p>
      <p><a href="${resetUrl}">Haz clic aquí para elegir una nueva contraseña</a></p>
      <p>Si no has sido tú, ignora este email — tu contraseña no cambiará.</p>
      <p>Este enlace caduca en 1 hora.</p>
    `,
  });
}
