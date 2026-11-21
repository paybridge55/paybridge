import { randomHex, sha256Hex } from "./crypto.js";

const COOKIE_NAME = "pb_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

export function readSessionToken(request) {
  const header = request.headers.get("cookie") || "";
  const parts = header.split(";");
  for (const part of parts) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    if (name === COOKIE_NAME) {
      return part.slice(index + 1).trim();
    }
  }
  return null;
}

export function sessionCookie(token) {
  return (
    COOKIE_NAME +
    "=" +
    token +
    "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=" +
    SESSION_SECONDS
  );
}

export function clearSessionCookie() {
  return COOKIE_NAME + "=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
}

export async function createSession(env, merchantId) {
  const token = randomHex(32);
  const tokenHash = await sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    "INSERT INTO sessions (token_hash, merchant_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
  )
    .bind(tokenHash, merchantId, now + SESSION_SECONDS, now)
    .run();
  return token;
}

export async function getSessionMerchant(env, request) {
  const token = readSessionToken(request);
  if (!token || token.length !== 64) return null;
  const tokenHash = await sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    "SELECT m.id AS id, m.email AS email, m.business_name AS business_name FROM sessions s JOIN merchants m ON m.id = s.merchant_id WHERE s.token_hash = ? AND s.expires_at > ?"
  )
    .bind(tokenHash, now)
    .first();
  return row || null;
}

export async function destroySession(env, request) {
  const token = readSessionToken(request);
  if (!token) return;
  const tokenHash = await sha256Hex(token);
  await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
    .bind(tokenHash)
    .run();
}

export async function checkRateLimit(env, key, limit, windowSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    "SELECT count, window_start FROM rate_limits WHERE key = ?"
  )
    .bind(key)
    .first();

  if (!row || now - row.window_start >= windowSeconds) {
    await env.DB.prepare(
      "INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, window_start = excluded.window_start"
    )
      .bind(key, now)
      .run();
    return true;
  }

  if (row.count >= limit) return false;

  await env.DB.prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?")
    .bind(key)
    .run();
  return true;
}
