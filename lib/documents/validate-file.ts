import { fileTypeFromBuffer } from "file-type";

import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, type DocumentKind } from "@/lib/documents/limits";

type ValidationResult =
  { ok: true; kind: DocumentKind; mime: string } | { ok: false; error: string };

/**
 * Valida tamaño y tipo real del archivo por magic bytes (no por extensión ni Content-Type
 * declarado por el cliente, que pueden falsificarse). Primera barrera contra uploads maliciosos.
 */
export async function validateUploadedFile(
  buffer: Buffer,
  declaredSize: number,
): Promise<ValidationResult> {
  if (declaredSize > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: `El archivo supera el máximo de ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`,
    };
  }
  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: `El archivo supera el máximo de ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`,
    };
  }
  if (buffer.byteLength === 0) {
    return { ok: false, error: "El archivo está vacío." };
  }

  const detected = await fileTypeFromBuffer(buffer);
  if (!detected) {
    return {
      ok: false,
      error:
        "No se pudo determinar el tipo de archivo. Formatos admitidos: PDF, DOCX, PNG, JPEG, WEBP.",
    };
  }

  const kind = ALLOWED_MIME_TYPES[detected.mime];
  if (!kind) {
    return {
      ok: false,
      error: `Formato "${detected.mime}" no admitido. Formatos admitidos: PDF, DOCX, PNG, JPEG, WEBP.`,
    };
  }

  return { ok: true, kind, mime: detected.mime };
}
