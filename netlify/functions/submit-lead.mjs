import { getStore } from "@netlify/blobs";

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

  const cap = (val, max) => (val ? String(val).slice(0, max) : "");

  const store = getStore("leads");
  const id = Date.now() + "-" + Math.random().toString(36).slice(2, 8);

  const lead = {
    id,
    name: cap(data.name, 200),
    phone: cap(data.phone, 50),
    email: cap(data.email, 200),
    price: cap(data.price, 50),
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
