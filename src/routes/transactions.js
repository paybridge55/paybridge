import { json, errorJson } from "../lib/response.js";
import { getSessionMerchant } from "../lib/session.js";
import { randomHex } from "../lib/crypto.js";

const MAX_BODY_BYTES = 2048;

async function nextTransactionId(env) {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM transactions"
  ).first();
  const number = 100001 + (row ? row.total : 0);
  return "PB_PAY_" + number + "_" + randomHex(2);
}

export async function listTransactions(request, env) {
  const merchant = await getSessionMerchant(env, request);
  if (!merchant) return errorJson("UNAUTHENTICATED", "पहले Login करें।", 401);

  const result = await env.DB.prepare(
    "SELECT id, amount, currency, status, description, created_at FROM transactions WHERE merchant_id = ? ORDER BY created_at DESC LIMIT 50"
  )
    .bind(merchant.id)
    .all();

  return json({ mode: "test", transactions: result.results || [] });
}

export async function createDemoTransaction(request, env) {
  const merchant = await getSessionMerchant(env, request);
  if (!merchant) return errorJson("UNAUTHENTICATED", "पहले Login करें।", 401);

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return errorJson("INVALID_BODY", "भेजा गया डेटा बहुत बड़ा है।", 400);
  }
  let body;
  try {
    body = JSON.parse(text);
  } catch (e) {
    return errorJson("INVALID_BODY", "भेजा गया डेटा सही नहीं है।", 400);
  }
  if (!body || typeof body !== "object") {
    return errorJson("INVALID_BODY", "भेजा गया डेटा सही नहीं है।", 400);
  }

  const rupees = Number(body.amount);
  if (!Number.isFinite(rupees) || rupees < 1 || rupees > 100000) {
    return errorJson("INVALID_AMOUNT", "रकम 1 से 1,00,000 रुपये के बीच होनी चाहिए।", 400);
  }
  const amount = Math.round(rupees * 100);

  const allowed = ["SUCCESS", "FAILED", "PENDING"];
  const status = allowed.indexOf(body.status) === -1 ? "SUCCESS" : body.status;

  let description = typeof body.description === "string" ? body.description : "";
  description = description.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 100);
  if (!description) description = "Demo Test Payment";

  const id = await nextTransactionId(env);
  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare(
    "INSERT INTO transactions (id, merchant_id, amount, currency, status, description, created_at) VALUES (?, ?, ?, 'INR', ?, ?, ?)"
  )
    .bind(id, merchant.id, amount, status, description, now)
    .run();

  return json(
    {
      transaction: {
        id: id,
        amount: amount,
        currency: "INR",
        status: status,
        description: description,
        created_at: now,
      },
    },
    201
  );
}
