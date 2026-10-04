import { headers } from "next/headers";

/** Best-effort IP para rate limiting. No es a prueba de spoofing total, basta para frenar abuso casual. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}
