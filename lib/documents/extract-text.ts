import type { DocumentKind } from "@/lib/documents/limits";
import { extractDocxText } from "@/lib/documents/extract/docx";
import { extractImageText } from "@/lib/documents/extract/image";
import { extractPdfText } from "@/lib/documents/extract/pdf";

export async function extractTextByKind(
  kind: DocumentKind,
  buffer: Buffer,
): Promise<{ text: string; pageCount: number | null }> {
  switch (kind) {
    case "pdf": {
      const { text, pageCount } = await extractPdfText(buffer);
      return { text, pageCount };
    }
    case "docx": {
      const { text } = await extractDocxText(buffer);
      return { text, pageCount: null };
    }
    case "image": {
      const { text } = await extractImageText(buffer);
      return { text, pageCount: null };
    }
  }
}
