"use server";

import { randomUUID } from "node:crypto";

import { del, put } from "@vercel/blob";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateUploadedFile } from "@/lib/documents/validate-file";
import { avatarUploadRateLimiter, isRateLimited } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

const MAX_AVATAR_SIZE_BYTES = 3 * 1024 * 1024; // 3MB, de sobra para una foto de perfil

export async function uploadAvatarAction(
  formData: FormData,
): Promise<{ error?: string; avatarUrl?: string }> {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado." };

  const ip = await getClientIp();
  if (await isRateLimited(avatarUploadRateLimiter, `avatar:${session.user.id}:${ip}`)) {
    return { error: "Demasiados cambios de foto en poco tiempo. Prueba de nuevo en un rato." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No se ha seleccionado ningún archivo." };
  if (file.size > MAX_AVATAR_SIZE_BYTES) return { error: "La imagen no puede superar 3MB." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = await validateUploadedFile(buffer, buffer.byteLength);
  if (!validation.ok) return { error: validation.error };
  if (validation.kind !== "image")
    return { error: "El avatar debe ser una imagen (PNG, JPEG o WEBP)." };

  const profile = await db.profile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return { error: "Perfil no encontrado." };

  // Mismo store privado que los documentos: el avatar se sirve a través de nuestra propia ruta
  // (app/api/avatars/[userId]), no con una URL pública de Blob directa.
  const pathname = `avatars/${session.user.id}/${randomUUID()}`;
  await put(pathname, buffer, { access: "private", contentType: validation.mime });

  if (profile.avatarPathname) {
    await del(profile.avatarPathname).catch(() => {});
  }

  await db.profile.update({
    where: { userId: session.user.id },
    data: { avatarPathname: pathname },
  });

  // El query param fuerza que <Image> vuelva a pedir la foto dentro de la misma sesión del
  // navegador (si la URL no cambia, React no repinta el <img> aunque el contenido en el
  // servidor sí haya cambiado). La caché HTTP real la gestiona el ETag en la ruta.
  return { avatarUrl: `/api/avatars/${session.user.id}?v=${Date.now()}` };
}

export async function deleteAvatarAction(): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado." };

  const profile = await db.profile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return { error: "Perfil no encontrado." };
  if (!profile.avatarPathname) return {};

  await del(profile.avatarPathname).catch(() => {});

  await db.profile.update({
    where: { userId: session.user.id },
    data: { avatarPathname: null },
  });

  return {};
}
