import { adminCookie, createAdminSession, isAdminPasswordValid } from "../../server/session";
import { json } from "../../server/http";

async function login(request: Request) {
  try {
    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password !== "string" || !isAdminPasswordValid(body.password)) {
      return json({ error: "รหัสผ่านไม่ถูกต้อง" }, 401);
    }
    return json({ authenticated: true }, 200, { "set-cookie": adminCookie(createAdminSession(), 8 * 60 * 60) });
  } catch {
    return json({ error: "ไม่สามารถเข้าสู่ระบบได้" }, 500);
  }
}

export default {
  fetch(request: Request) {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { allow: "POST" });
    return login(request);
  },
};
