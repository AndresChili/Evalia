import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Upstash es opcional en desarrollo: si no está configurado, no bloqueamos nada
// (solo avisamos una vez), para no romper `npm run dev` a quien clone el repo
// sin haberlo provisionado todavía. En producción sí debe estar configurado.
//
// La integración "Upstash for Redis" de Vercel expone KV_REST_API_URL/TOKEN (convención
// heredada de @vercel/kv), no UPSTASH_REDIS_REST_URL/TOKEN — se aceptan ambos nombres por
// si alguien provisiona Upstash directamente en vez de vía el Marketplace de Vercel.
const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

if (!redis && process.env.NODE_ENV !== "test") {
  console.warn(
    "[rate-limit] KV_REST_API_URL/TOKEN (o UPSTASH_REDIS_REST_URL/TOKEN) no configurados — rate limiting desactivado.",
  );
}

function createLimiter(requests: number, window: Parameters<typeof Ratelimit.slidingWindow>[1]) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: false,
  });
}

export const loginRateLimiter = createLimiter(10, "1 m");
export const registerRateLimiter = createLimiter(5, "1 h");
export const passwordResetRateLimiter = createLimiter(3, "1 h");
export const documentUploadRateLimiter = createLimiter(10, "1 h");
export const testGenerationRateLimiter = createLimiter(10, "1 h");
export const avatarUploadRateLimiter = createLimiter(10, "1 h");
export const userSearchRateLimiter = createLimiter(30, "1 m");
export const friendRequestRateLimiter = createLimiter(20, "1 h");

/** Devuelve true si la petición debe bloquearse. Si no hay limiter configurado, nunca bloquea. */
export async function isRateLimited(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<boolean> {
  if (!limiter) return false;
  const { success } = await limiter.limit(identifier);
  return !success;
}
