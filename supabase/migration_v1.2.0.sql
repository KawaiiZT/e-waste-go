-- รันไฟล์นี้ใน Supabase SQL Editor สำหรับระบบที่สร้างตาราง bookings ไว้แล้ว
alter table public.bookings
  add column if not exists admin_notes text;

