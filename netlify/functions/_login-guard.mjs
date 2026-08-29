import { getStore } from "@netlify/blobs";

const WINDOW_MS = 5 * 60 * 1000; // 5 минут
const MAX_ATTEMPTS = 8; // максимум 8 неверных попыток за 5 минут с одного IP

export function getClientIp(req) {
  return req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "unknown";
}

// Возвращает true, если этому IP сейчас запрещено пробовать пароль дальше
export async function isLockedOut(ip) {
  try {
    const store = getStore("rate-limit-login");
    const entry = await store.get("login:" + ip, { type: "json" });
    if (!entry) return false;
    if (Date.now() - entry.windowStart > WINDOW_MS) return false;
    return entry.attempts >= MAX_ATTEMPTS;
  } catch {
    return false; // если хранилище недоступно — не блокируем вход из-за этого
  }
}

export async function recordFailedAttempt(ip) {
  try {
    const store = getStore("rate-limit-login");
    const key = "login:" + ip;
    const now = Date.now();
    const entry = await store.get(key, { type: "json" });
    if (entry && now - entry.windowStart < WINDOW_MS) {
      await store.setJSON(key, { windowStart: entry.windowStart, attempts: entry.attempts + 1 });
    } else {
      await store.setJSON(key, { windowStart: now, attempts: 1 });
    }
  } catch {
    // не критично, если не удалось записать попытку
  }
}

export async function clearAttempts(ip) {
  try {
    const store = getStore("rate-limit-login");
    await store.delete("login:" + ip);
  } catch {
    // не критично
  }
}
