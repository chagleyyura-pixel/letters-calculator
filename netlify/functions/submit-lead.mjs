import { getStore } from "@netlify/blobs";
import { recalcPrice, normalizeText } from "./_pricing.mjs";

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 минута
const RATE_LIMIT_MAX = 5; // не больше 5 заявок в минуту с одного IP
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 минут — окно для отсева дублей

function getClientIp(req) {
  return req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "unknown";
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let data;
  try {
    data = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!data.name || !data.phone) {
    return new Response(JSON.stringify({ error: "name and phone are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Honeypot: реальные пользователи никогда не заполняют это скрытое поле
  if (data.website && String(data.website).trim() !== "") {
    return new Response(JSON.stringify({ ok: true, id: "skipped" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ip = getClientIp(req);
  const rateStore = getStore("rate-limit-submit");
  const rateKey = "submit:" + ip;
  const now = Date.now();

  try {
    const existing = await rateStore.get(rateKey, { type: "json" });
    if (existing && now - existing.windowStart < RATE_LIMIT_WINDOW_MS) {
      if (existing.count >= RATE_LIMIT_MAX) {
        return new Response(JSON.stringify({ error: "Слишком много заявок подряд, попробуйте через минуту" }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }
      await rateStore.setJSON(rateKey, { windowStart: existing.windowStart, count: existing.count + 1 });
    } else {
      await rateStore.setJSON(rateKey, { windowStart: now, count: 1 });
    }
  } catch {
    // если хранилище недоступно — не блокируем заявку из-за этого, просто пропускаем лимит
  }

  const cap = (val, max) => (val ? String(val).slice(0, max) : "");

  const store = getStore("leads");

  // Дедупликация: тот же телефон + тот же текст вывески за последние 5 минут — считаем повтором
  const normPhone = cap(data.phone, 50).replace(/\D/g, "");
  const normSign = normalizeText(data.signText).toLowerCase();
  try {
    const { blobs } = await store.list();
    for (const b of blobs.slice(-50)) { // проверяем только последние 50 заявок, этого достаточно
      const existingLead = await store.get(b.key, { type: "json" });
      if (!existingLead) continue;
      const existingPhone = String(existingLead.phone || "").replace(/\D/g, "");
      const existingSign = normalizeText(existingLead.signText || "").toLowerCase();
      const age = now - new Date(existingLead.createdAt).getTime();
      if (existingPhone === normPhone && existingSign === normSign && age >= 0 && age < DEDUP_WINDOW_MS) {
        return new Response(JSON.stringify({ ok: true, id: existingLead.id, deduplicated: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
  } catch {
    // если проверка дублей не удалась — не блокируем заявку из-за этого
  }

  // Пересчёт цены на сервере: клиентская цена — только для истории/сравнения,
  // реальная стоимость всегда пересчитывается по собственной серверной формуле.
  const clientPrice = cap(data.price, 50);
  const recalced = recalcPrice({
    signText: data.signText,
    height: data.height,
    type: data.type,
    font: data.font,
    place: data.place,
    cls: data.cls,
    backing: data.backing,
    mount: data.mount,
    thinElements: !!data.thinElements,
  });

  let verifiedPrice = clientPrice;
  let priceVerified = false;
  if (recalced) {
    priceVerified = true;
    verifiedPrice = recalced.mountIsCustom
      ? recalced.total.toLocaleString("ru-RU") + " ₽ + монтаж"
      : recalced.total.toLocaleString("ru-RU") + " ₽";
  }

  const id = Date.now() + "-" + Math.random().toString(36).slice(2, 8);

  const lead = {
    id,
    name: cap(data.name, 200),
    phone: cap(data.phone, 50),
    email: cap(data.email, 200),
    price: verifiedPrice,
    priceFromClient: clientPrice,
    priceVerified,
    signText: cap(data.signText, 200),
    height: cap(data.height, 30),
    type: cap(data.type, 100),
    font: cap(data.font, 100),
    place: cap(data.place, 50),
    cls: cap(data.cls, 50),
    backing: cap(data.backing, 100),
    mount: cap(data.mount, 100),
    faceColor: cap(data.faceColor, 100),
    edgeColor: cap(data.edgeColor, 100),
    thinElements: !!data.thinElements,
    source: cap(data.source, 100),
    status: "new",
    deleted: false,
    createdAt: new Date().toISOString(),
  };

  await store.setJSON(id, lead);

  return new Response(JSON.stringify({ ok: true, id }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  path: "/.netlify/functions/submit-lead",
};
