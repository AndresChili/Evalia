import { createWorker } from "tesseract.js";

/**
 * OCR local y gratuito (WASM, sin API externa de pago). Limitado a texto impreso/escaneado
 * nítido — el texto manuscrito no es fiable con este motor, ver limitaciones en el README.
 */
export async function extractImageText(buffer: Buffer): Promise<{ text: string }> {
  const worker = await createWorker("spa+eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return { text };
  } finally {
    await worker.terminate();
  }
}
