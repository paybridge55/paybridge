const SECURITY_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...SECURITY_HEADERS, ...extraHeaders },
  });
}

export function errorJson(code, message, status = 400, extraHeaders = {}) {
  return json({ error: { code, message } }, status, extraHeaders);
}
