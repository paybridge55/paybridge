import { json, errorJson } from "../lib/response.js";
import { randomHex, hashPassword, safeEqual } from "../lib/crypto.js";
import {
  normalizeEmail,
  validateEmail,
  validatePassword,
  cleanBusinessName,
  validateBusinessName,
} from "../lib/validate.js";
import {
  createSession,
  destroySession,
  getSessionMerchant,
  sessionCookie,
  clearSessionCookie,
  checkRateLimit,
} from "../lib/session.js";

const MAX_BODY_BYTES = 4096;

function clientIp(request) {
  return request.headers.get("cf-connecting-ip") || "unknown";
}

async function readJsonBody(request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return null;
  try {
    const data = JSON.parse(text);
    if (data && typeof data === "object" && !Array.isArray(data)) return data;
    return null;
  } catch (e) {
    return null;
  }
}

async function nextMerchantId(env) {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM merchants"
  ).first();
  const number = 100001 + (row ? row.total : 0);
  return "PB_MERCH_" + number;
}

export async function signup(request, env) {
  const ip = clientIp(request);
  const allowed = await checkRateLimit(env, "signup:" + ip, 5, 3600);
  if (!allowed) {
    return errorJson("RATE_LIMITED", "बहुत ज़्यादा कोशिशें। कुछ देर बाद फिर करें।", 429);
  }

  const body = await readJsonBody(request);
  if (!body) {
    return errorJson("INVALID_BODY", "भेजा गया डेटा सही नहीं है।", 400);
  }

  const email = normalizeEmail(body.email);
  const businessName = cleanBusinessName(body.business_name);
  const password = body.password;

  const emailError = validateEmail(email);
  if (emailError) return errorJson("INVALID_EMAIL", emailError, 400);

  const nameError = validateBusinessName(businessName);
  if (nameError) return errorJson("INVALID_BUSINESS_NAME", nameError, 400);

  const passwordError = validatePassword(password);
  if (passwordError) return errorJson("INVALID_PASSWORD", passwordError, 400);

  const existing = await env.DB.prepare(
    "SELECT id FROM merchants WHERE email = ?"
  )
    .bind(email)
    .first();
  if (existing) {
    return errorJson("EMAIL_EXISTS", "इस Email से खाता पहले से है।", 409);
  }

  const salt = randomHex(16);
  const passwordHash = await hashPassword(password, salt);
  const merchantId = await nextMerchantId(env);
  const now = Math.floor(Date.now() / 1000);

  try {
    await env.DB.prepare(
      "INSERT INTO merchants (id, email, password_hash, salt, business_name, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(merchantId, email, passwordHash, salt, businessName, now)
      .run();
  } catch (e) {
    return errorJson("SIGNUP_FAILED", "खाता नहीं बन पाया। फिर कोशिश करें।", 500);
  }

  const token = await createSession(env, merchantId);
  return json(
    {
      merchant: {
        id: merchantId,
        email: email,
        business_name: businessName,
      },
    },
    201,
    { "set-cookie": sessionCookie(token) }
  );
}

export async function login(request, env) {
  const ip = clientIp(request);
  const allowed = await checkRateLimit(env, "login:" + ip, 10, 900);
  if (!allowed) {
    return errorJson("RATE_LIMITED", "बहुत ज़्यादा कोशिशें। कुछ देर बाद फिर करें।", 429);
  }

  const body = await readJsonBody(request);
  if (!body) {
    return errorJson("INVALID_BODY", "भेजा गया डेटा सही नहीं है।", 400);
  }

  const email = normalizeEmail(body.email);
  const password = body.password;

  if (!email || typeof password !== "string" || !password || password.length > 128) {
    return errorJson("INVALID_CREDENTIALS", "Email या Password गलत है।", 401);
  }

  const row = await env.DB.prepare(
    "SELECT id, email, password_hash, salt, business_name FROM merchants WHERE email = ?"
  )
    .bind(email)
    .first();

  if (!row) {
    await hashPassword(password, randomHex(16));
    return errorJson("INVALID_CREDENTIALS", "Email या Password गलत है।", 401);
  }

  const attempt = await hashPassword(password, row.salt);
  if (!safeEqual(attempt, row.password_hash)) {
    return errorJson("INVALID_CREDENTIALS", "Email या Password गलत है।", 401);
  }

  const token = await createSession(env, row.id);
  return json(
    {
      merchant: {
        id: row.id,
        email: row.email,
        business_name: row.business_name,
      },
    },
    200,
    { "set-cookie": sessionCookie(token) }
  );
}

export async function logout(request, env) {
  await destroySession(env, request);
  return json({ ok: true }, 200, { "set-cookie": clearSessionCookie() });
}

export async function me(request, env) {
  const merchant = await getSessionMerchant(env, request);
  if (!merchant) {
    return errorJson("UNAUTHENTICATED", "पहले Login करें।", 401);
  }
  return json({ merchant: merchant });
}
