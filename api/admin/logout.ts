import { adminCookie } from "../../server/session";
import { json } from "../../server/http";

export async function POST() {
  return json({ authenticated: false }, 200, { "set-cookie": adminCookie("", 0) });
}
