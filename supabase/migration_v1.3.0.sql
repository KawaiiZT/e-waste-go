-- รันไฟล์นี้ใน Supabase SQL Editor หนึ่งครั้งก่อน Deploy เวอร์ชัน 1.3.0
alter table public.bookings add column if not exists pickup_lat double precision;
alter table public.bookings add column if not exists pickup_lng double precision;

alter table public.bookings drop constraint if exists bookings_pickup_address_check;
alter table public.bookings
  add constraint bookings_pickup_address_check
  check (char_length(pickup_address) between 1 and 500);

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings
  add constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'en_route', 'completed', 'cancelled'));

alter table public.bookings drop constraint if exists bookings_pickup_lat_check;
alter table public.bookings
  add constraint bookings_pickup_lat_check
  check (pickup_lat is null or pickup_lat between -90 and 90);

alter table public.bookings drop constraint if exists bookings_pickup_lng_check;
alter table public.bookings
  add constraint bookings_pickup_lng_check
  check (pickup_lng is null or pickup_lng between -180 and 180);

create index if not exists bookings_location_idx on public.bookings (pickup_lat, pickup_lng);
