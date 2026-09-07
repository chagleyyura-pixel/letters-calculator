import { getStore } from "@netlify/blobs";
import { getClientIp, isLockedOut, recordFailedAttempt, clearAttempts } from "./_login-guard.mjs";

const ALLOWED_STATUSES = ["new", "in_progress", "closed"];

export default async (req) => {
  const ip = getClientIp(req);

  if (await isLockedOut(ip)) {
    return new Response(JSON.stringify({ error: "Слишком много неверных попыток входа. Попробуйте через несколько минут." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  const password = req.headers.get("x-admin-password") || "";
  const expected = Netlify.env.get("ADMIN_PASSWORD") || "";

  if (!expected || password !== expected) {
    await recordFailedAttempt(ip);
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  await clearAttempts(ip);

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

  const { id, status, deleted } = body;
  if (!id || (status === undefined && deleted === undefined)) {
    return new Response(JSON.stringify({ error: "id and (status or deleted) required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
    return new Response(JSON.stringify({ error: "invalid status" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (deleted !== undefined && typeof deleted !== "boolean") {
    return new Response(JSON.stringify({ error: "deleted must be boolean" }), {
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

  if (status !== undefined) lead.status = status;
  if (deleted !== undefined) lead.deleted = deleted;
  await store.setJSON(id, lead);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  path: "/.netlify/functions/update-lead-status",
};
