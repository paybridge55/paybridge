import { json, errorJson } from "./lib/response.js";
import { signup, login, logout, me } from "./routes/auth.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

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
