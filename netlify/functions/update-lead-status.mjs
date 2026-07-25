import { getStore } from "@netlify/blobs";

const ALLOWED_STATUSES = ["new", "in_progress", "closed"];

export default async (req) => {
  const password = req.headers.get("x-admin-password") || "";
  const expected = Netlify.env.get("ADMIN_PASSWORD") || "";

  if (!expected || password !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST" && req.method !== "PATCH") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id, status } = body;
  if (!id || !ALLOWED_STATUSES.includes(status)) {
    return new Response(JSON.stringify({ error: "id and valid status required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const store = getStore("leads");
  const lead = await store.get(id, { type: "json" });
  if (!lead) {
    return new Response(JSON.stringify({ error: "Lead not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  lead.status = status;
  await store.setJSON(id, lead);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  path: "/.netlify/functions/update-lead-status",
};
