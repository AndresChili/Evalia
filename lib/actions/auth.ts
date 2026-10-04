"use server";

import { AuthError } from "next-auth";

import { auth, signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  isRateLimited,
  loginRateLimiter,
  passwordResetRateLimiter,
  registerRateLimiter,
} from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { generateToken, hashToken } from "@/lib/token";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "@/lib/validation/auth";

type ActionResult = { error?: string; message?: string };

const GENERIC_PASSWORD_RESET_MESSAGE =
  "Si existe una cuenta con ese email, te hemos enviado un enlace para restablecer la contraseña.";

export async function registerAction(input: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  const ip = await getClientIp();
  if (await isRateLimited(registerRateLimiter, `register:${ip}`)) {
    return { error: "Demasiados intentos. Prueba de nuevo en un rato." };
  }

  const { email, password, displayName } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "Ya existe una cuenta con ese email." };

  const passwordHash = await hashPassword(password);

  await db.user.create({
    data: {
      email,
      passwordHash,
      profile: { create: { displayName } },
    },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) return { error: "No se pudo iniciar sesión." };
    throw error; // NEXT_REDIRECT u otro control-flow de Next, debe propagar
  }

  return {};
}

export async function loginAction(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  const ip = await getClientIp();
  if (await isRateLimited(loginRateLimiter, `login:${ip}:${parsed.data.email}`)) {
    return { error: "Demasiados intentos. Prueba de nuevo en un minuto." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email o contraseña incorrectos." };
    }
    throw error;
  }

  return {};
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function requestPasswordResetAction(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { error: "Email inválido." };

  const ip = await getClientIp();
  if (await isRateLimited(passwordResetRateLimiter, `reset:${ip}:${parsed.data.email}`)) {
    // Mismo mensaje genérico aunque esté limitado, para no filtrar nada por timing/respuesta.
    return { message: GENERIC_PASSWORD_RESET_MESSAGE };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });

  if (user) {
    const token = generateToken();
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const resetUrl = `${process.env.AUTH_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  }

  // Misma respuesta exista o no el usuario: evita enumeración de cuentas.
  return { message: GENERIC_PASSWORD_RESET_MESSAGE };
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  const tokenHash = hashToken(parsed.data.token);
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "El enlace no es válido o ha caducado. Solicita uno nuevo." };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return {};
}

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado." };

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "No autenticado." };

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { error: "La contraseña actual no es correcta." };

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.user.update({ where: { id: user.id }, data: { passwordHash } });

  return {};
}

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado." };

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  await db.profile.update({
    where: { userId: session.user.id },
    data: { displayName: parsed.data.displayName },
  });

  return {};
}
