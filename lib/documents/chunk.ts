export type TextChunk = {
  index: number;
  content: string;
  charStart: number;
  charEnd: number;
};

const TARGET_CHUNK_SIZE = 1200;
const OVERLAP = 150;
const BOUNDARY_LOOKAHEAD = 300;

/**
 * Divide el texto en fragmentos solapados de tamaño objetivo, intentando cortar en un
 * salto de párrafo cercano (o si no, en un espacio) para no partir palabras/frases a mitad.
 * El solape entre fragmentos consecutivos ayuda a no perder contexto en los bordes al generar
 * preguntas por fragmento.
 */
export function chunkText(text: string): TextChunk[] {
  if (text.length === 0) return [];

  const chunks: TextChunk[] = [];
  let pos = 0;
  let index = 0;

  while (pos < text.length) {
    let end = Math.min(pos + TARGET_CHUNK_SIZE, text.length);

    if (end < text.length) {
      const lookahead = text.slice(end, Math.min(end + BOUNDARY_LOOKAHEAD, text.length));
      const paragraphBreak = lookahead.indexOf("\n\n");
      if (paragraphBreak !== -1) {
        end += paragraphBreak;
      } else {
        const nextSpace = text.indexOf(" ", end);
        if (nextSpace !== -1 && nextSpace - end < BOUNDARY_LOOKAHEAD) end = nextSpace;
      }
    }

    const content = text.slice(pos, end).trim();
    if (content.length > 0) {
      chunks.push({ index, content, charStart: pos, charEnd: end });
      index += 1;
    }

    if (end >= text.length) break;
    pos = Math.max(end - OVERLAP, pos + 1);
  }

  return chunks;
}
