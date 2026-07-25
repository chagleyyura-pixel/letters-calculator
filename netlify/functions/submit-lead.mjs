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

  const store = getStore("leads");
  const id = Date.now() + "-" + Math.random().toString(36).slice(2, 8);

  const lead = {
    id,
    name: String(data.name).slice(0, 200),
    phone: String(data.phone).slice(0, 50),
    email: data.email ? String(data.email).slice(0, 200) : "",
    price: data.price || "",
    signText: data.signText || "",
    height: data.height || "",
    type: data.type || "",
    font: data.font || "",
    place: data.place || "",
    cls: data.cls || "",
    backing: data.backing || "",
    mount: data.mount || "",
    faceColor: data.faceColor || "",
    edgeColor: data.edgeColor || "",
    thinElements: !!data.thinElements,
    source: data.source || "",
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
