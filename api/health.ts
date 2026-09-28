import { json } from "../server/http.js";

export default {
  fetch(request: Request) {
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, { allow: "GET" });
    return json({ ok: true, service: "e-waste-go" });
  },
};
