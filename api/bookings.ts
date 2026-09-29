import { errorMessage, json } from "../server/http.js";
import { supabaseRequest } from "../server/supabase.js";

type BookingInput = {
  customerName?: unknown;
  customerPhone?: unknown;
  pickupDetails?: unknown;
  pickupLat?: unknown;
  pickupLng?: unknown;
  pickupDate?: unknown;
  pickupTime?: unknown;
  notes?: unknown;
  items?: unknown;
  website?: unknown;
};

type ItemCounts = { phone: number; laptop: number; accessory: number; appliance: number };

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validCoordinate(value: unknown, min: number, max: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function validateItems(value: unknown): ItemCounts | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const result = {
    phone: Number(source.phone),
    laptop: Number(source.laptop),
    accessory: Number(source.accessory),
    appliance: Number(source.appliance),
  };
  if (Object.values(result).some((count) => !Number.isInteger(count) || count < 0 || count > 20)) return null;
  return Object.values(result).some((count) => count > 0) ? result : null;
}

async function createBooking(request: Request) {
  try {
    const body = (await request.json()) as BookingInput;
    if (body.website) return json({ error: "Invalid submission" }, 400);

    const customerName = cleanText(body.customerName, 120);
    const customerPhone = cleanText(body.customerPhone, 20).replace(/[^0-9+]/g, "");
    const pickupDetails = cleanText(body.pickupDetails, 500);
    const pickupLat = validCoordinate(body.pickupLat, -90, 90);
    const pickupLng = validCoordinate(body.pickupLng, -180, 180);
    const pickupDate = cleanText(body.pickupDate, 10);
    const pickupTime = cleanText(body.pickupTime, 20);
    const notes = cleanText(body.notes, 1000);
    const items = validateItems(body.items);

    if (customerName.length < 2) return json({ error: "กรุณากรอกชื่อผู้ติดต่อ" }, 422);
    if (!/^0[0-9]{8,9}$/.test(customerPhone)) return json({ error: "กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง" }, 422);
    if (pickupLat === null || pickupLng === null) return json({ error: "กรุณาเลือกตำแหน่งจุดรับบนแผนที่" }, 422);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) return json({ error: "วันที่รับไม่ถูกต้อง" }, 422);
    const selectedDate = new Date(`${pickupDate}T00:00:00+07:00`);
    const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) return json({ error: "ไม่สามารถเลือกวันที่ย้อนหลังได้" }, 422);
    if (!["09:00–12:00", "13:00–16:00"].includes(pickupTime)) return json({ error: "ช่วงเวลารับไม่ถูกต้อง" }, 422);
    if (!items) return json({ error: "กรุณาเลือกขยะอย่างน้อย 1 ชิ้น" }, 422);

    const rows = await supabaseRequest<Array<{ id: string; booking_ref: string; status: string }>>("bookings?select=id,booking_ref,status", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        customer_name: customerName,
        customer_phone: customerPhone,
        pickup_address: pickupDetails || "ตำแหน่งที่เลือกบนแผนที่",
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        pickup_date: pickupDate,
        pickup_time: pickupTime,
        notes: notes || null,
        items,
      }),
    });

    const booking = rows[0];
    if (!booking) throw new Error("ไม่พบข้อมูลนัดหมายหลังบันทึก");
    return json({ booking }, 201);
  } catch (error) {
    console.error(error);
    return json({ error: errorMessage(error) }, 500);
  }
}

async function lookupBooking(request: Request) {
  try {
    const url = new URL(request.url);
    const reference = cleanText(url.searchParams.get("reference"), 24).toUpperCase();
    const phone = cleanText(url.searchParams.get("phone"), 20).replace(/[^0-9+]/g, "");
    if (!reference || !phone) return json({ error: "กรุณากรอกเลขนัดหมายและเบอร์โทรศัพท์" }, 422);

    const params = new URLSearchParams({
      select: "booking_ref,status,pickup_address,pickup_lat,pickup_lng,pickup_date,pickup_time,items,created_at,updated_at",
      booking_ref: `eq.${reference}`,
      customer_phone: `eq.${phone}`,
      limit: "1",
    });
    const rows = await supabaseRequest<Array<Record<string, unknown>>>(`bookings?${params.toString()}`);
    if (!rows[0]) return json({ error: "ไม่พบนัดหมายที่ตรงกับข้อมูลนี้" }, 404);
    return json({ booking: rows[0] });
  } catch (error) {
    console.error(error);
    return json({ error: errorMessage(error) }, 500);
  }
}

export default {
  fetch(request: Request) {
    if (request.method === "POST") return createBooking(request);
    if (request.method === "GET") return lookupBooking(request);
    return json({ error: "Method not allowed" }, 405, { allow: "GET, POST" });
  },
};
