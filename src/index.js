// PAYBRIDGE - Backend entry (Phase 1: health check only)
// Secret keys must only live in Cloudflare Secrets, never here.

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/v1/health") {
      return json({
        status: "ok",
        service: "paybridge",
        mode: "test",
        live_payments: false,
        time: new Date().toISOString(),
      });
    }

    if (url.pathname.startsWith("/api/")) {
      return json(
        { error: { code: "not_found", message: "Endpoint not found." } },
        404
      );
    }

    return env.ASSETS.fetch(request);
  },
};
