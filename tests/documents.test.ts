import { describe, expect, it } from "vitest";

import { chunkText } from "@/lib/documents/chunk";
import { cleanExtractedText } from "@/lib/documents/clean";
import { MAX_FILE_SIZE_BYTES } from "@/lib/documents/limits";
import { validateUploadedFile } from "@/lib/documents/validate-file";

const MINIMAL_PDF = Buffer.from(
  `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
trailer<</Size 1/Root 1 0 R>>
%%EOF`,
  "latin1",
);

describe("cleanExtractedText", () => {
  it("collapses repeated whitespace and blank lines", () => {
    const dirty = "Hola   mundo\n\n\n\nsegunda   línea   \n  \n  tercera";
    const clean = cleanExtractedText(dirty);
    expect(clean).not.toMatch(/ {2,}/);
    expect(clean).not.toMatch(/\n{3,}/);
  });

  it("trims leading/trailing whitespace", () => {
    expect(cleanExtractedText("   hola   ")).toBe("hola");
  });

  it("normalizes CRLF to LF", () => {
    expect(cleanExtractedText("a\r\nb")).toBe("a\nb");
  });
});

describe("chunkText", () => {
  it("returns an empty array for empty input", () => {
    expect(chunkText("")).toEqual([]);
  });

  it("returns a single chunk for short text", () => {
    const chunks = chunkText("Texto corto de prueba.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.content).toBe("Texto corto de prueba.");
  });

  it("splits long text into multiple overlapping chunks", () => {
    const paragraph = "Esta es una frase de relleno para alcanzar el tamaño objetivo. ";
    const longText = paragraph.repeat(100); // ~6500 caracteres
    const chunks = chunkText(longText);

    expect(chunks.length).toBeGreaterThan(1);
    // Los índices son correlativos empezando en 0.
    chunks.forEach((chunk, i) => expect(chunk.index).toBe(i));
    // Cada posición de inicio avanza (no se queda atascado) y los chunks cubren todo el texto.
    expect(chunks[0]!.charStart).toBe(0);
    expect(chunks.at(-1)!.charEnd).toBeGreaterThanOrEqual(longText.length - 1);
  });

  it("every chunk's recorded char range matches its content", () => {
    const text = "Primer párrafo con algo de contenido.\n\nSegundo párrafo distinto.";
    const chunks = chunkText(text);
    for (const chunk of chunks) {
      expect(text.slice(chunk.charStart, chunk.charEnd)).toContain(chunk.content.slice(0, 10));
    }
  });
});

describe("validateUploadedFile", () => {
  it("accepts a real PDF (magic bytes) within size limits", async () => {
    const result = await validateUploadedFile(MINIMAL_PDF, MINIMAL_PDF.byteLength);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.kind).toBe("pdf");
  });

  it("rejects a file over the size limit", async () => {
    const result = await validateUploadedFile(MINIMAL_PDF, MAX_FILE_SIZE_BYTES + 1);
    expect(result.ok).toBe(false);
  });

  it("rejects an empty file", async () => {
    const result = await validateUploadedFile(Buffer.alloc(0), 0);
    expect(result.ok).toBe(false);
  });

  it("rejects content whose real type isn't in the allow-list (e.g. an executable)", async () => {
    // Magic bytes de un ejecutable Windows (MZ header) — nunca debe aceptarse aunque
    // alguien le ponga extensión .pdf o .docx.
    const fakeExe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    const result = await validateUploadedFile(fakeExe, fakeExe.byteLength);
    expect(result.ok).toBe(false);
  });

  it("rejects content with no recognizable file signature", async () => {
    const randomBytes = Buffer.from("esto no es ningún formato de archivo reconocible");
    const result = await validateUploadedFile(randomBytes, randomBytes.byteLength);
    expect(result.ok).toBe(false);
  });
});
