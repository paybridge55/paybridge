import { json, errorJson } from "./lib/response.js";
import { signup, login, logout, me } from "./routes/auth.js";
import { getSessionMerchant } from "./lib/session.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (path.startsWith("/app/") || path === "/app") {
      if (method !== "GET" && method !== "HEAD") {
        return new Response("Method Not Allowed", { status: 405 });
      }
      let merchant = null;
      try {
        merchant = await getSessionMerchant(env, request);
      } catch (e) {
        merchant = null;
      }
      if (!merchant) {
        return new Response(null, {
          status: 302,
          headers: {
            location: "/login.html",
            "cache-control": "no-store",
          },
        });
      }
      const assetResponse = await env.ASSETS.fetch(request);
      const headers = new Headers(assetResponse.headers);
      headers.set("cache-control", "no-store");
      return new Response(assetResponse.body, {
        status: assetResponse.status,
        headers: headers,
      });
    }

    if (!path.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    try {
      if (path === "/api/v1/health" && method === "GET") {
        return json({ status: "ok", service: "paybridge", mode: "test" });
      }

      if (path === "/api/v1/auth/signup" && method === "POST") {
        return await signup(request, env);
      }
      if (path === "/api/v1/auth/login" && method === "POST") {
        return await login(request, env);
      }
      if (path === "/api/v1/auth/logout" && method === "POST") {
        return await logout(request, env);
      }
      if (path === "/api/v1/auth/me" && method === "GET") {
        return await me(request, env);
      }

      return errorJson("NOT_FOUND", "यह API मौजूद नहीं है।", 404);
    } catch (e) {
      return errorJson("SERVER_ERROR", "सर्वर में गड़बड़ी हुई। बाद में कोशिश करें।", 500);
    }
  },
};
