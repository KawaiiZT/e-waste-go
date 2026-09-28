import { adminCookie } from "../../server/session";
import { json } from "../../server/http";

function logout() {
  return json({ authenticated: false }, 200, { "set-cookie": adminCookie("", 0) });
}

export default {
  fetch(request: Request) {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { allow: "POST" });
    return logout();
  },
};
