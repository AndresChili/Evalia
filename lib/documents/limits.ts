export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
export const MAX_DOCUMENTS_PER_USER = 30; // control de coste/abuso, no límite técnico real

export type DocumentKind = "pdf" | "docx" | "image";

// Mapa de MIME real (detectado por magic bytes, no por extensión/Content-Type del cliente) -> tipo.
export const ALLOWED_MIME_TYPES: Record<string, DocumentKind> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
};
