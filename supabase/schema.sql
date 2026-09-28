create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_ref text not null unique default ('EW' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  customer_phone text not null check (customer_phone ~ '^0[0-9]{8,9}$'),
  pickup_address text not null check (char_length(pickup_address) between 10 and 500),
  pickup_date date not null,
  pickup_time text not null check (pickup_time in ('09:00–12:00', '13:00–16:00')),
  items jsonb not null,
  notes text,
  admin_notes text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- รองรับ Project เดิมที่สร้างตารางก่อนมีฟิลด์หมายเหตุภายใน
alter table public.bookings add column if not exists admin_notes text;

create index if not exists bookings_created_at_idx on public.bookings (created_at desc);
create index if not exists bookings_pickup_date_idx on public.bookings (pickup_date);
create index if not exists bookings_status_idx on public.bookings (status);

alter table public.bookings enable row level security;

-- ไม่มี policy สำหรับ public/anonymous: เว็บเรียกฐานข้อมูลผ่าน Server API เท่านั้น
grant usage on schema public to service_role;
grant select, insert, update on public.bookings to service_role;
