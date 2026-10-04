import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ userId: string }> };

/**
 * Sirve el avatar de un usuario desde el store privado de Blob. Cualquier usuario autenticado
 * puede verlo (igual que el resto de la app, todo vive detrás de login) — no hace falta que
 * coincida con el propio userId, para que amigos/compañeros puedan ver tu foto.
 */
export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return new NextResponse(null, { status: 401 });

  const { userId } = await params;
  const profile = await db.profile.findUnique({
    where: { userId },
    select: { avatarPathname: true },
  });
  if (!profile?.avatarPathname) return new NextResponse(null, { status: 404 });

  const result = await get(profile.avatarPathname, { access: "private" });
  if (!result || result.statusCode !== 200) return new NextResponse(null, { status: 404 });

  // La URL es fija por usuario pero el contenido cambia con cada subida (pathname interno
  // distinto) — no-cache fuerza revalidación con ETag en vez de servir una foto vieja cacheada.
  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Cache-Control": "private, no-cache",
      ETag: result.blob.etag,
    },
  });
}
