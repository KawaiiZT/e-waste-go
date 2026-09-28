import { json, errorMessage } from "../../server/http.js";
import { isAdminRequest } from "../../server/session.js";
import { supabaseRequest } from "../../server/supabase.js";

const bookingSelect = "id,booking_ref,customer_name,customer_phone,pickup_address,pickup_date,pickup_time,items,notes,admin_notes,status,created_at,updated_at";
const allowedStatuses = ["pending", "confirmed", "completed", "cancelled"] as const;

type BookingStatus = typeof allowedStatuses[number];
type UpdateBookingInput = {
  id?: unknown;
  status?: unknown;
  pickupDate?: unknown;
  pickupTime?: unknown;
  adminNotes?: unknown;
};

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function listBookings(request: Request) {
  if (!isAdminRequest(request)) return json({ error: "กรุณาเข้าสู่ระบบ" }, 401);
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "all";
    const params = new URLSearchParams({
      select: bookingSelect,
      order: "created_at.desc",
      limit: "200",
    });
    if ((allowedStatuses as readonly string[]).includes(status)) params.set("status", `eq.${status}`);
    const bookings = await supabaseRequest<Array<Record<string, unknown>>>(`bookings?${params.toString()}`);
    return json({ bookings });
  } catch (error) {
    console.error(error);
    return json({ error: errorMessage(error) }, 500);
  }
}

async function updateBooking(request: Request) {
  if (!isAdminRequest(request)) return json({ error: "กรุณาเข้าสู่ระบบ" }, 401);
  try {
    const body = (await request.json()) as UpdateBookingInput;
    const id = cleanText(body.id, 36);
    const status = cleanText(body.status, 20) as BookingStatus;
    const pickupDate = cleanText(body.pickupDate, 10);
    const pickupTime = cleanText(body.pickupTime, 20);
    const adminNotes = cleanText(body.adminNotes, 2000);

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return json({ error: "รหัสรายการไม่ถูกต้อง" }, 422);
    if (!(allowedStatuses as readonly string[]).includes(status)) return json({ error: "สถานะไม่ถูกต้อง" }, 422);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) return json({ error: "วันที่รับไม่ถูกต้อง" }, 422);
    if (!["09:00–12:00", "13:00–16:00"].includes(pickupTime)) return json({ error: "ช่วงเวลารับไม่ถูกต้อง" }, 422);

    const params = new URLSearchParams({ id: `eq.${id}`, select: bookingSelect });
    const rows = await supabaseRequest<Array<Record<string, unknown>>>(`bookings?${params.toString()}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status,
        pickup_date: pickupDate,
        pickup_time: pickupTime,
        admin_notes: adminNotes || null,
        updated_at: new Date().toISOString(),
      }),
    });
    if (!rows[0]) return json({ error: "ไม่พบรายการที่ต้องการแก้ไข" }, 404);
    return json({ booking: rows[0] });
  } catch (error) {
    console.error(error);
    return json({ error: errorMessage(error) }, 500);
  }
}

export default {
  fetch(request: Request) {
    if (request.method === "GET") return listBookings(request);
    if (request.method === "PATCH") return updateBooking(request);
    return json({ error: "Method not allowed" }, 405, { allow: "GET, PATCH" });
  },
};
