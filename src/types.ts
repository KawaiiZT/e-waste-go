export type ItemKey = "phone" | "laptop" | "accessory" | "appliance";

export type BookingStatus = "pending" | "confirmed" | "en_route" | "completed" | "cancelled";

export type Coordinates = {
  lat: number;
  lng: number;
};

export type BookingRecord = {
  id?: string;
  booking_ref: string;
  customer_name?: string;
  customer_phone?: string;
  pickup_address?: string;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  pickup_date: string;
  pickup_time: string;
  items: Record<ItemKey, number>;
  notes?: string | null;
  admin_notes?: string | null;
  status: BookingStatus;
  created_at: string;
  updated_at?: string;
};
