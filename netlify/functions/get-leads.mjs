import { getStore } from "@netlify/blobs";
import { getClientIp, isLockedOut, recordFailedAttempt, clearAttempts } from "./_login-guard.mjs";

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

  const store = getStore("leads");
  const { blobs } = await store.list();

  const leads = [];
  for (const blob of blobs) {
    const lead = await store.get(blob.key, { type: "json" });
    if (lead) leads.push(lead);
  }

  leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return new Response(JSON.stringify(leads), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  path: "/.netlify/functions/get-leads",
};
