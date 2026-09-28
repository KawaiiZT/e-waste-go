import { requiredEnv } from "./env";

const baseHeaders = () => {
  const secret = requiredEnv("SUPABASE_SECRET_KEY");
  return {
    apikey: secret,
    authorization: `Bearer ${secret}`,
    "content-type": "application/json",
  };
};

export async function supabaseRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${requiredEnv("SUPABASE_URL").replace(/\/$/, "")}/rest/v1/${path}`;
  const response = await fetch(url, {
    ...init,
    headers: { ...baseHeaders(), ...(init.headers ?? {}) },
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Supabase request failed", response.status, detail);
    throw new Error("ไม่สามารถเชื่อมต่อฐานข้อมูลได้");
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
