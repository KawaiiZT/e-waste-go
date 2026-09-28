import { createHmac, timingSafeEqual } from "node:crypto";
import { requiredEnv } from "./env.js";

const COOKIE_NAME = "ewaste_admin_session";

function sign(payload: string) {
  return createHmac("sha256", requiredEnv("SESSION_SECRET")).update(payload).digest("base64url");
}

export function createAdminSession() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 8 * 60 * 60 * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function isAdminPasswordValid(input: string) {
  const expected = Buffer.from(requiredEnv("ADMIN_PASSWORD"));
  const actual = Buffer.from(input);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function isAdminRequest(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const value = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!value) return false;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

export function adminCookie(value: string, maxAge: number) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=${maxAge}`;
}
