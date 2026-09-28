import { json, errorMessage } from "../../server/http";
import { isAdminRequest } from "../../server/session";
import { supabaseRequest } from "../../server/supabase";

async function listBookings(request: Request) {
  if (!isAdminRequest(request)) return json({ error: "กรุณาเข้าสู่ระบบ" }, 401);
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "all";
    const params = new URLSearchParams({
      select: "id,booking_ref,customer_name,customer_phone,pickup_address,pickup_date,pickup_time,items,notes,status,created_at",
      order: "created_at.desc",
      limit: "200",
    });
    if (["pending", "confirmed", "completed", "cancelled"].includes(status)) params.set("status", `eq.${status}`);
    const bookings = await supabaseRequest<Array<Record<string, unknown>>>(`bookings?${params.toString()}`);
    return json({ bookings });
  } catch (error) {
    console.error(error);
    return json({ error: errorMessage(error) }, 500);
  }
}

export default {
  fetch(request: Request) {
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, { allow: "GET" });
    return listBookings(request);
  },
};
