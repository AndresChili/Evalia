"use server";

import { randomUUID } from "node:crypto";

import { del, put } from "@vercel/blob";

import { auth } from "@/lib/auth";
import { chunkText } from "@/lib/documents/chunk";
import { cleanExtractedText } from "@/lib/documents/clean";
import { extractTextByKind } from "@/lib/documents/extract-text";
import { MAX_DOCUMENTS_PER_USER } from "@/lib/documents/limits";
import { validateUploadedFile } from "@/lib/documents/validate-file";
import { db } from "@/lib/db";
import { documentUploadRateLimiter, isRateLimited } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

type ActionResult = { error?: string; documentId?: string };

export async function uploadDocumentAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No se ha seleccionado ningún archivo." };

  const ip = await getClientIp();
  if (await isRateLimited(documentUploadRateLimiter, `upload:${session.user.id}:${ip}`)) {
    return { error: "Demasiadas subidas en poco tiempo. Prueba de nuevo en un rato." };
  }

  const documentCount = await db.document.count({ where: { userId: session.user.id } });
  if (documentCount >= MAX_DOCUMENTS_PER_USER) {
    return {
      error: `Has alcanzado el máximo de ${MAX_DOCUMENTS_PER_USER} documentos. Borra alguno para subir otro.`,
    };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const validation = await validateUploadedFile(buffer, file.size);
  if (!validation.ok) return { error: validation.error };

  const blobPathname = `documents/${session.user.id}/${randomUUID()}`;
  const blob = await put(blobPathname, buffer, {
    access: "private",
    contentType: validation.mime,
  });

  const document = await db.document.create({
    data: {
      userId: session.user.id,
      originalFilename: file.name,
      mimeType: validation.mime,
      sizeBytes: buffer.byteLength,
      blobUrl: blob.url,
      status: "EXTRACTING",
    },
  });

  try {
    const { text: rawText, pageCount } = await extractTextByKind(validation.kind, buffer);
    const cleanedText = cleanExtractedText(rawText);

    if (cleanedText.length === 0) {
      throw new Error(
        "No se ha podido extraer texto legible del archivo (¿está vacío, es una imagen sin texto, o un PDF escaneado sin OCR aplicable?).",
      );
    }

    const chunks = chunkText(cleanedText);

    await db.$transaction([
      db.documentChunk.createMany({
        data: chunks.map((chunk) => ({
          documentId: document.id,
          index: chunk.index,
          content: chunk.content,
          charStart: chunk.charStart,
          charEnd: chunk.charEnd,
        })),
      }),
      db.document.update({
        where: { id: document.id },
        data: {
          extractedText: cleanedText,
          charCount: cleanedText.length,
          pageCount,
          status: "READY",
        },
      }),
    ]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido al procesar el archivo.";
    await db.document.update({
      where: { id: document.id },
      data: { status: "FAILED", errorMessage: message },
    });
  } finally {
    // Privacidad: no conservamos el archivo original más tiempo del necesario para extraer
    // el texto, haya ido bien o mal. El texto extraído (si lo hay) ya vive en la DB.
    await del(blob.url).catch(() => {});
    await db.document.update({
      where: { id: document.id },
      data: { blobUrl: null, blobDeletedAt: new Date() },
    });
  }

  const finalDocument = await db.document.findUnique({ where: { id: document.id } });
  if (finalDocument?.status === "FAILED") {
    return {
      error: finalDocument.errorMessage ?? "No se pudo procesar el archivo.",
      documentId: document.id,
    };
  }

  return { documentId: document.id };
}

export async function deleteDocumentAction(documentId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado." };

  const document = await db.document.findUnique({ where: { id: documentId } });
  if (!document || document.userId !== session.user.id) {
    return { error: "Documento no encontrado." };
  }

  if (document.blobUrl) {
    await del(document.blobUrl).catch(() => {});
  }

  await db.document.delete({ where: { id: documentId } });

  return {};
}
