import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Clock3,
  Computer,
  FileDown,
  Headphones,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MapPin,
  Minus,
  PackageCheck,
  Phone,
  Plus,
  Recycle,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Smartphone,
  Truck,
  UserRound,
  WashingMachine,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BookingProgress } from "@/components/BookingProgress";
import { LocationPicker, RouteMap } from "@/components/PickupMap";
import type { BookingRecord, Coordinates, ItemKey } from "@/types";

type View = "booking" | "lookup" | "success";

type BookingForm = {
  customerName: string;
  customerPhone: string;
  pickupDetails: string;
  notes: string;
  website: string;
};

type ItemMeta = { label: string; examples?: string; Icon: typeof Smartphone };

const itemConfig: Record<ItemKey, ItemMeta> = {
  small: { label: "อุปกรณ์อิเล็กทรอนิกส์ขนาดเล็ก", examples: "ถ่าน, โทรศัพท์, สายชาร์จ", Icon: Smartphone },
  medium: { label: "อุปกรณ์อิเล็กทรอนิกส์ขนาดกลาง", examples: "Monitor, PC, พัดลม", Icon: Computer },
  large: { label: "อุปกรณ์อิเล็กทรอนิกส์ขนาดใหญ่", examples: "ตู้เย็น, เครื่องปรับอากาศ (แอร์)", Icon: WashingMachine },
  other: { label: "อื่น ๆ", examples: "โปรดระบุชนิดอุปกรณ์ในหมายเหตุ", Icon: Recycle },
};

const legacyItemConfig: Record<string, ItemMeta> = {
  phone: { label: "โทรศัพท์และแท็บเล็ต", Icon: Smartphone },
  laptop: { label: "คอมพิวเตอร์และโน้ตบุ๊ก", Icon: Computer },
  accessory: { label: "สายชาร์จและอุปกรณ์เสริม", Icon: Headphones },
  appliance: { label: "เครื่องใช้ไฟฟ้าขนาดเล็ก", Icon: WashingMachine },
};

const getItemMeta = (key: string): ItemMeta => itemConfig[key as ItemKey] ?? legacyItemConfig[key] ?? { label: key, Icon: Recycle };

const statusText = {
  pending: "รอตรวจสอบ",
  confirmed: "ยืนยันนัดแล้ว",
  en_route: "กำลังเดินทาง",
  completed: "รับขยะแล้ว",
  cancelled: "ยกเลิก",
};

async function readApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return response.json() as Promise<T>;

  const detail = (await response.text()).trim();
  throw new Error(
    response.status >= 500
      ? "ระบบเซิร์ฟเวอร์ขัดข้อง กรุณาตรวจสอบ Vercel Function Logs และ Environment Variables"
      : detail || `เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง (${response.status})`,
  );
}

function PickupCalendar({ selected, minDate, onSelect }: { selected: Date; minDate: Date; onSelect: (date: Date) => void }) {
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const normalizedMin = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
  const todayValue = new Date();
  const today = new Date(todayValue.getFullYear(), todayValue.getMonth(), todayValue.getDate());
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const firstWeekday = monthStart.getDay();
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const cellCount = firstWeekday + daysInMonth <= 35 ? 35 : 42;
  const canGoPrevious = monthStart > new Date(normalizedMin.getFullYear(), normalizedMin.getMonth(), 1);
  const monthLabel = new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(visibleMonth);
  const weekdays = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  const cells = Array.from({ length: cellCount }, (_, index) => {
    const dayNumber = index - firstWeekday + 1;
    return dayNumber >= 1 && dayNumber <= daysInMonth ? dayNumber : null;
  });
  const isSameDay = (left: Date, right: Date) => left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
  const moveMonth = (amount: number) => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));

  return (
    <div className="booking-calendar" aria-label="ปฏิทินเลือกวันรับขยะ">
      <div className="calendar-toolbar">
        <button type="button" aria-label="เดือนก่อนหน้า" onClick={() => moveMonth(-1)} disabled={!canGoPrevious}><ChevronLeft /></button>
        <strong>{monthLabel}</strong>
        <button type="button" aria-label="เดือนถัดไป" onClick={() => moveMonth(1)}><ChevronRight /></button>
      </div>
      <div className="calendar-weekdays" aria-hidden="true">{weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}</div>
      <div className="calendar-days">
        {cells.map((dayNumber, index) => {
          if (!dayNumber) return <span className="calendar-day empty" key={`empty-${index}`} />;
          const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), dayNumber);
          const disabled = date < normalizedMin;
          const selectedDay = isSameDay(date, selected);
          const todayDay = isSameDay(date, today);
          const className = ["calendar-day", disabled ? "disabled" : "available", selectedDay ? "selected" : "", todayDay ? "today" : ""].filter(Boolean).join(" ");
          return <button type="button" key={date.toISOString()} className={className} disabled={disabled} aria-label={new Intl.DateTimeFormat("th-TH", { dateStyle: "full" }).format(date)} aria-pressed={selectedDay} onClick={() => onSelect(date)}>{dayNumber}</button>;
        })}
      </div>
    </div>
  );
}

function Brand() {
  return (
    <a href="/" className="brand" aria-label="E-Waste Go หน้าแรก">
      <span><Recycle aria-hidden="true" /></span>
      <div><strong>E-Waste Go</strong><small>Electronic waste pickup</small></div>
    </a>
  );
}

function Header({ active, onNavigate }: { active: "booking" | "lookup"; onNavigate: (view: "booking" | "lookup") => void }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Brand />
        <nav aria-label="เมนูผู้ใช้งาน">
          <button className={active === "booking" ? "active" : ""} onClick={() => onNavigate("booking")}><CalendarDays /> นัดรับขยะ</button>
          <button className={active === "lookup" ? "active" : ""} onClick={() => onNavigate("lookup")}><Search /> ตรวจสอบสถานะ</button>
        </nav>
        <a className="admin-link" href="/admin"><ShieldCheck /> สำหรับเจ้าหน้าที่</a>
      </div>
    </header>
  );
}

export default function App() {
  return window.location.pathname.startsWith("/admin") ? <AdminApp /> : <UserApp />;
}

function UserApp() {
  const tomorrow = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  const [view, setView] = useState<View>("booking");
  const [form, setForm] = useState<BookingForm>({ customerName: "", customerPhone: "", pickupDetails: "", notes: "", website: "" });
  const [pickupLocation, setPickupLocation] = useState<Coordinates | null>(null);
  const [items, setItems] = useState<Record<ItemKey, number>>({ small: 0, medium: 0, large: 0, other: 0 });
  const [selectedDate, setSelectedDate] = useState(tomorrow);
  const [timeSlot, setTimeSlot] = useState("09:00–12:00");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdBooking, setCreatedBooking] = useState<BookingRecord | null>(null);

  const totalItems = Object.values(items).reduce((sum, count) => sum + count, 0);
  const dateLabel = new Intl.DateTimeFormat("th-TH", { dateStyle: "long" }).format(selectedDate);

  const updateForm = (key: keyof BookingForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const updateItem = (key: ItemKey, change: number) => setItems((current) => ({ ...current, [key]: Math.max(0, Math.min(20, current[key] + change)) }));
  const toIsoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const submitBooking = async () => {
    setError("");
    if (!form.customerName.trim() || !form.customerPhone.trim()) return setError("กรุณากรอกชื่อและเบอร์โทรศัพท์ให้ครบ");
    if (!pickupLocation) return setError("กรุณาเลือกตำแหน่งจุดรับบนแผนที่");
    if (totalItems === 0) return setError("กรุณาเลือกขยะอย่างน้อย 1 ชิ้น");
    setSubmitting(true);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, pickupLat: pickupLocation.lat, pickupLng: pickupLocation.lng, items, pickupDate: toIsoDate(selectedDate), pickupTime: timeSlot }),
      });
      const result = await readApiResponse<{ booking?: BookingRecord; error?: string }>(response);
      if (!response.ok || !result.booking) throw new Error(result.error || "บันทึกนัดหมายไม่สำเร็จ");
      setCreatedBooking(result.booking);
      setView("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  };

  const navigate = (next: "booking" | "lookup") => {
    setView(next);
    setError("");
  };

  return (
    <div className="page-shell">
      <Header active={view === "lookup" ? "lookup" : "booking"} onNavigate={navigate} />
      {view === "booking" && (
        <main className="workspace">
          <section className="page-intro user-hero">
            <div className="user-hero-copy"><span className="eyebrow">E-WASTE PICKUP</span><h1>ขยะเก่า<br />ให้เรารับไปดูแล</h1><p>นัดรับถึงบ้านได้ง่ายเหมือนเรียกเดลิเวอรี สะดวก ปลอดภัย และส่งต่ออย่างถูกวิธี</p></div>
            <div className="desktop-hero-visual" aria-hidden="true"><span className="hero-circle" /><span className="hero-laptop"><i /></span><span className="hero-phone" /><span className="hero-truck"><Truck /></span></div>
            <div className="secure-note"><ShieldCheck /><span><strong>ข้อมูลส่งตรงถึงเจ้าหน้าที่</strong><small>จัดเก็บผ่านระบบฐานข้อมูลที่กำหนด</small></span></div>
          </section>

          <div className="booking-layout">
            <div className="booking-main">
              <section className="panel">
                <div className="panel-heading"><span>1</span><div><h2>ข้อมูลผู้ติดต่อ</h2><p>เจ้าหน้าที่จะใช้ข้อมูลนี้เพื่อติดต่อยืนยันนัด</p></div></div>
                <div className="form-grid">
                  <label><span>ชื่อผู้ติดต่อ *</span><div className="input-wrap"><UserRound /><input value={form.customerName} onChange={(event) => updateForm("customerName", event.target.value)} placeholder="ชื่อ-นามสกุล" autoComplete="name" /></div></label>
                  <label><span>เบอร์โทรศัพท์ *</span><div className="input-wrap"><Phone /><input value={form.customerPhone} onChange={(event) => updateForm("customerPhone", event.target.value)} placeholder="08XXXXXXXX" inputMode="tel" autoComplete="tel" /></div></label>
                  <div className="full"><LocationPicker value={pickupLocation} onChange={setPickupLocation} /></div>
                  <label className="full"><span>รายละเอียดจุดรับ (ไม่บังคับ)</span><div className="input-wrap"><MapPin /><input value={form.pickupDetails} onChange={(event) => updateForm("pickupDetails", event.target.value)} placeholder="เช่น อาคาร A ชั้น 2 หรือโทรเมื่อถึงหน้าประตู" maxLength={500} /></div></label>
                  <label className="full"><span>หมายเหตุถึงเจ้าหน้าที่</span><textarea className="plain-textarea" value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="เช่น กรุณาโทรก่อนเข้ารับ หรือมีอุปกรณ์ชำรุดแตกหัก" rows={2} /></label>
                  <label className="honeypot" aria-hidden="true">Website<input tabIndex={-1} value={form.website} onChange={(event) => updateForm("website", event.target.value)} autoComplete="off" /></label>
                </div>
              </section>

              <section className="panel">
                <div className="panel-heading"><span>2</span><div><h2>รายการขยะอิเล็กทรอนิกส์</h2><p>ระบุจำนวนอุปกรณ์ที่ต้องการให้เข้ารับ</p></div></div>
                <div className="item-grid">
                  {(Object.keys(itemConfig) as ItemKey[]).map((key) => {
                    const { label, examples, Icon } = itemConfig[key];
                    return (
                      <article key={key} className={items[key] > 0 ? "item-card selected" : "item-card"}>
                        <span className="item-icon"><Icon /></span><div className="item-copy"><strong>{label}</strong><small>{examples}</small></div>
                        <div className="quantity"><button disabled={items[key] === 0} aria-label={`ลดจำนวน ${label}`} onClick={() => updateItem(key, -1)}><Minus /></button><output>{items[key]}</output><button aria-label={`เพิ่มจำนวน ${label}`} onClick={() => updateItem(key, 1)}><Plus /></button></div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="panel schedule-panel">
                <div className="panel-heading"><span>3</span><div><h2>เลือกวันและเวลา</h2><p>เลือกวันที่สะดวกสำหรับให้เจ้าหน้าที่เข้ารับ</p></div></div>
                <div className="schedule-grid">
                  <div className="calendar-wrap">
                    <PickupCalendar selected={selectedDate} minDate={tomorrow} onSelect={setSelectedDate} />
                    <div className="calendar-legend" aria-label="คำอธิบายสถานะวันที่"><span><i className="available" /> เลือกได้</span><span><i className="selected" /> วันที่เลือก</span><span><i className="unavailable" /> เลือกไม่ได้</span></div>
                  </div>
                  <div className="time-picker"><h3>ช่วงเวลาเข้ารับ</h3>{["09:00–12:00", "13:00–16:00"].map((time) => <button key={time} className={timeSlot === time ? "selected" : ""} onClick={() => setTimeSlot(time)}><Clock3 /><span><strong>{time}</strong><small>{time.startsWith("09") ? "รอบเช้า" : "รอบบ่าย"}</small></span>{timeSlot === time && <Check />}</button>)}</div>
                </div>
              </section>
            </div>

            <aside className="summary-panel">
              <span className="summary-label">สรุปคำขอนัดรับ</span>
              <h2>{totalItems} ชิ้น</h2>
              <div className="summary-items">{(Object.keys(items) as ItemKey[]).filter((key) => items[key] > 0).map((key) => <div key={key}><span>{itemConfig[key].label}</span><strong>{items[key]}</strong></div>)}{totalItems === 0 && <p>ยังไม่ได้เลือกรายการขยะ</p>}</div>
              <hr />
              <div className="summary-line"><CalendarDays /><span><small>วันที่รับ</small><strong>{dateLabel}</strong></span></div>
              <div className="summary-line"><Clock3 /><span><small>ช่วงเวลา</small><strong>{timeSlot}</strong></span></div>
              <div className="summary-line"><MapPin /><span><small>ตำแหน่งรับ</small><strong>{pickupLocation ? "เลือกตำแหน่งแล้ว" : "ยังไม่ได้เลือก"}</strong></span></div>
              {error && <div className="form-error" role="alert"><CircleAlert />{error}</div>}
              <Button className="submit-button" onClick={submitBooking} disabled={submitting}>{submitting ? <><LoaderCircle className="spin" /> กำลังบันทึก</> : <>ส่งคำขอนัดรับ <ArrowRight /></>}</Button>
              <p className="terms-note">เมื่อส่งคำขอ เจ้าหน้าที่จะตรวจสอบและติดต่อกลับเพื่อยืนยันนัดหมาย</p>
            </aside>
          </div>
        </main>
      )}
      {view === "lookup" && <LookupView />}
      {view === "success" && createdBooking && <SuccessView booking={createdBooking} onLookup={() => navigate("lookup")} onNew={() => { setCreatedBooking(null); navigate("booking"); }} />}
    </div>
  );
}

function LookupView() {
  const [reference, setReference] = useState("");
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookup = async () => {
    setLoading(true); setError(""); setBooking(null);
    try {
      const response = await fetch(`/api/bookings?reference=${encodeURIComponent(reference)}&phone=${encodeURIComponent(phone)}`);
      const result = await readApiResponse<{ booking?: BookingRecord; error?: string }>(response);
      if (!response.ok || !result.booking) throw new Error(result.error || "ไม่พบข้อมูล");
      setBooking(result.booking);
    } catch (lookupError) { setError(lookupError instanceof Error ? lookupError.message : "ไม่สามารถตรวจสอบได้"); }
    finally { setLoading(false); }
  };

  return (
    <main className="narrow-workspace">
      <section className={booking ? "lookup-card has-result" : "lookup-card"}>
        <div className="lookup-heading"><span className="large-icon"><Search /></span><div><h1>ตรวจสอบสถานะนัดรับ</h1><p>กรอกเลขนัดหมายและเบอร์โทรศัพท์ที่ใช้สร้างรายการ</p></div></div>
        <div className="lookup-form"><label><span>เลขนัดหมาย</span><input value={reference} onChange={(event) => setReference(event.target.value.toUpperCase())} placeholder="เช่น EW12AB34CD" /></label><label><span>เบอร์โทรศัพท์</span><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="08XXXXXXXX" inputMode="tel" /></label><Button onClick={lookup} disabled={loading || !reference || !phone}>{loading ? <LoaderCircle className="spin" /> : <Search />} ตรวจสอบสถานะ</Button></div>
        {error && <div className="form-error"><CircleAlert />{error}</div>}
        {booking && (
          <div className="tracking-result">
            <div className="tracking-header"><div><small>เลขนัดหมาย</small><strong>{booking.booking_ref}</strong></div><span className={`status ${booking.status}`}>{statusText[booking.status]}</span></div>
            <div className="appointment-summary"><p><CalendarDays /> {new Intl.DateTimeFormat("th-TH", { dateStyle: "long" }).format(new Date(`${booking.pickup_date}T00:00:00`))}</p><p><Clock3 /> {booking.pickup_time}</p></div>
            <section className="tracking-section"><div className="tracking-section-title"><span>ขั้นตอนการเข้ารับ</span><small>อัปเดตตามสถานะล่าสุดจากเจ้าหน้าที่</small></div><BookingProgress status={booking.status} /></section>
            <section className="tracking-section"><div className="tracking-section-title"><span>Route และจุดรับ</span><small>{booking.pickup_address || "ตำแหน่งที่เลือกบนแผนที่"}</small></div><RouteMap destination={booking.pickup_lat != null && booking.pickup_lng != null ? { lat: Number(booking.pickup_lat), lng: Number(booking.pickup_lng) } : null} /></section>
          </div>
        )}
      </section>
    </main>
  );
}

function SuccessView({ booking, onLookup, onNew }: { booking: BookingRecord; onLookup: () => void; onNew: () => void }) {
  return (
    <main className="narrow-workspace">
      <section className="success-card"><span className="success-check"><Check /></span><span className="eyebrow">บันทึกสำเร็จ</span><h1>ส่งคำขอนัดรับแล้ว</h1><p>เจ้าหน้าที่จะตรวจสอบข้อมูลและติดต่อกลับเพื่อยืนยันวันรับ</p><div className="reference-box"><small>เลขนัดหมาย</small><strong>{booking.booking_ref}</strong><span>โปรดบันทึกเลขนี้ไว้สำหรับตรวจสอบสถานะ</span></div><div className="success-actions"><Button onClick={onLookup}>ตรวจสอบสถานะ <ChevronRight /></Button><Button variant="outline" onClick={onNew}>สร้างนัดหมายใหม่</Button></div></section>
    </main>
  );
}

function AdminApp() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);

  const loadBookings = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/bookings", { credentials: "include" });
      if (response.status === 401) { setAuthenticated(false); setBookings([]); return; }
      const result = await readApiResponse<{ bookings?: BookingRecord[]; error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "โหลดข้อมูลไม่สำเร็จ");
      setBookings(result.bookings ?? []); setAuthenticated(true);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "เกิดข้อผิดพลาด"); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadBookings(); }, []);

  const login = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await readApiResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "เข้าสู่ระบบไม่สำเร็จ");
      setPassword(""); await loadBookings();
    } catch (loginError) { setError(loginError instanceof Error ? loginError.message : "เข้าสู่ระบบไม่สำเร็จ"); setLoading(false); }
  };

  const logout = async () => { await fetch("/api/admin/logout", { method: "POST", credentials: "include" }); setAuthenticated(false); setBookings([]); };
  const visibleBookings = bookings.filter((booking) => (status === "all" || booking.status === status) && `${booking.booking_ref} ${booking.customer_name} ${booking.customer_phone}`.toLowerCase().includes(query.toLowerCase()));

  const updateBookingInState = (updated: BookingRecord) => {
    setBookings((current) => current.map((booking) => booking.id === updated.id ? updated : booking));
    setSelectedBooking(updated);
  };

  const exportCsv = () => {
    const csvCell = (value: unknown) => {
      let text = String(value ?? "").replace(/\r?\n/g, " ");
      if (/^[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const rows = visibleBookings.map((booking) => [
      booking.booking_ref,
      booking.customer_name,
      booking.customer_phone,
      booking.pickup_date,
      booking.pickup_time,
      statusText[booking.status],
      Object.values(booking.items).reduce((sum, count) => sum + Number(count), 0),
      booking.pickup_address,
      booking.pickup_lat,
      booking.pickup_lng,
      booking.notes,
      booking.admin_notes,
      booking.created_at,
    ]);
    const header = ["เลขนัดหมาย", "ชื่อผู้ติดต่อ", "เบอร์โทร", "วันที่รับ", "ช่วงเวลา", "สถานะ", "จำนวนชิ้น", "รายละเอียดจุดรับ", "ละติจูด", "ลองจิจูด", "หมายเหตุผู้ใช้", "หมายเหตุภายใน", "วันที่สร้าง"];
    const csv = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `e-waste-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (authenticated === null || (loading && !authenticated)) return <div className="fullscreen-loader"><LoaderCircle className="spin" /><span>กำลังตรวจสอบระบบ</span></div>;
  if (!authenticated) return (
    <div className="admin-login-page"><header><Brand /><a href="/"><ArrowLeft /> กลับหน้าผู้ใช้งาน</a></header><form className="admin-login-card" onSubmit={login}><span className="large-icon"><LockKeyhole /></span><h1>เข้าสู่ระบบเจ้าหน้าที่</h1><p>กรอกรหัสผ่านผู้ดูแลระบบเพื่อดูรายการนัดรับ</p><label><span>รหัสผ่าน</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" autoFocus /></label>{error && <div className="form-error"><CircleAlert />{error}</div>}<Button type="submit" disabled={loading || !password}>{loading ? <LoaderCircle className="spin" /> : <LockKeyhole />} เข้าสู่ระบบ</Button></form></div>
  );

  return (
    <div className="admin-page">
      <header className="admin-header"><Brand /><div><a href="/"><UserRound /> หน้าผู้ใช้งาน</a><button onClick={logout}><LogOut /> ออกจากระบบ</button></div></header>
      <main className="admin-workspace">
        <section className="admin-title"><div><span className="eyebrow">ADMIN DASHBOARD</span><h1>รายการนัดรับขยะ</h1><p>ข้อมูลล่าสุดจากระบบฐานข้อมูล</p></div><div className="admin-title-actions"><Button variant="outline" onClick={exportCsv} disabled={visibleBookings.length === 0}><FileDown /> ส่งออก CSV</Button><Button variant="outline" onClick={loadBookings} disabled={loading}><RefreshCw className={loading ? "spin" : ""} /> รีเฟรชข้อมูล</Button></div></section>
        <section className="stats-row"><div><ClipboardList /><span><small>รายการทั้งหมด</small><strong>{bookings.length}</strong></span></div><div><Clock3 /><span><small>รอตรวจสอบ</small><strong>{bookings.filter((item) => item.status === "pending").length}</strong></span></div><div><Truck /><span><small>กำลังเดินทาง</small><strong>{bookings.filter((item) => item.status === "en_route").length}</strong></span></div><div><PackageCheck /><span><small>รับขยะแล้ว</small><strong>{bookings.filter((item) => item.status === "completed").length}</strong></span></div></section>
        <section className="admin-panel">
          <div className="table-tools"><div className="search-box"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาเลขนัดหมาย ชื่อ หรือเบอร์โทร" /></div><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">ทุกสถานะ</option><option value="pending">รอตรวจสอบ</option><option value="confirmed">ยืนยันนัดแล้ว</option><option value="en_route">กำลังเดินทาง</option><option value="completed">รับขยะแล้ว</option><option value="cancelled">ยกเลิก</option></select></div>
          {error && <div className="form-error"><CircleAlert />{error}</div>}
          <div className="table-scroll"><table><thead><tr><th>เลขนัดหมาย</th><th>ผู้ติดต่อ</th><th>วันและเวลา</th><th>รายการ</th><th>สถานที่รับ</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>{visibleBookings.map((booking) => <tr key={booking.id ?? booking.booking_ref}><td><strong>{booking.booking_ref}</strong><small>{new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(booking.created_at))}</small></td><td><strong>{booking.customer_name}</strong><small>{booking.customer_phone}</small></td><td><strong>{new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(`${booking.pickup_date}T00:00:00`))}</strong><small>{booking.pickup_time}</small></td><td><strong>{Object.values(booking.items).reduce((sum, count) => sum + Number(count), 0)} ชิ้น</strong><small>{Object.keys(booking.items).filter((key) => Number(booking.items[key]) > 0).map((key) => getItemMeta(key).label).join(", ")}</small></td><td className="address-cell"><strong>{booking.pickup_lat != null ? "มีพิกัดบนแผนที่" : "รายการเดิมไม่มีพิกัด"}</strong><small>{booking.pickup_address || "-"}</small></td><td><span className={`status ${booking.status}`}>{statusText[booking.status]}</span></td><td><button className="detail-button" onClick={() => setSelectedBooking(booking)}>ดูรายละเอียด <ChevronRight /></button></td></tr>)}</tbody></table>{!loading && visibleBookings.length === 0 && <div className="empty-state"><LayoutDashboard /><h3>ยังไม่มีรายการนัดรับ</h3><p>รายการที่ผู้ใช้ส่งเข้ามาจะแสดงในหน้านี้</p></div>}</div>
        </section>
      </main>
      {selectedBooking && <BookingDetailModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} onSaved={updateBookingInState} />}
    </div>
  );
}

function BookingDetailModal({ booking, onClose, onSaved }: { booking: BookingRecord; onClose: () => void; onSaved: (booking: BookingRecord) => void }) {
  const [editStatus, setEditStatus] = useState(booking.status);
  const [editDate, setEditDate] = useState(booking.pickup_date);
  const [editTime, setEditTime] = useState(booking.pickup_time);
  const [adminNotes, setAdminNotes] = useState(booking.admin_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [onClose]);

  const saveChanges = async () => {
    if (!booking.id) return setSaveError("ไม่พบรหัสรายการสำหรับแก้ไข");
    setSaving(true); setSaveError(""); setSaved(false);
    try {
      const response = await fetch("/api/admin/bookings", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: booking.id, status: editStatus, pickupDate: editDate, pickupTime: editTime, adminNotes }),
      });
      const result = await readApiResponse<{ booking?: BookingRecord; error?: string }>(response);
      if (!response.ok || !result.booking) throw new Error(result.error || "บันทึกการเปลี่ยนแปลงไม่สำเร็จ");
      onSaved(result.booking);
      setSaved(true);
    } catch (updateError) {
      setSaveError(updateError instanceof Error ? updateError.message : "บันทึกการเปลี่ยนแปลงไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const totalItems = Object.values(booking.items).reduce((sum, count) => sum + Number(count), 0);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-header"><div><span className="eyebrow">BOOKING DETAIL</span><h2 id="booking-detail-title">{booking.booking_ref}</h2><span className={`status ${booking.status}`}>{statusText[booking.status]}</span></div><button aria-label="ปิดหน้าต่าง" onClick={onClose}><X /></button></header>
        <div className="modal-content">
          <div className="detail-grid">
            <section className="detail-card"><span className="detail-icon"><UserRound /></span><div><small>ผู้ติดต่อ</small><strong>{booking.customer_name || "-"}</strong><a href={`tel:${booking.customer_phone}`}>{booking.customer_phone || "-"}</a></div></section>
            <section className="detail-card"><span className="detail-icon"><CalendarDays /></span><div><small>วันและเวลานัดรับ</small><strong>{new Intl.DateTimeFormat("th-TH", { dateStyle: "long" }).format(new Date(`${booking.pickup_date}T00:00:00`))}</strong><span>{booking.pickup_time}</span></div></section>
          </div>
          <section className="detail-section address-detail-section"><div className="detail-heading"><div><MapPin /><span><small>รายละเอียดจุดรับ</small><strong>{booking.pickup_address || "ผู้ใช้เลือกตำแหน่งจากแผนที่"}</strong></span></div></div><RouteMap destination={booking.pickup_lat != null && booking.pickup_lng != null ? { lat: Number(booking.pickup_lat), lng: Number(booking.pickup_lng) } : null} /></section>
          <section className="detail-section progress-detail-section"><div className="detail-heading"><div><Truck /><span><small>สถานะการดำเนินงาน</small><strong>{statusText[booking.status]}</strong></span></div></div><BookingProgress status={booking.status} compact /></section>
          <section className="detail-section"><div className="detail-heading"><div><PackageCheck /><span><small>รายการขยะ</small><strong>ทั้งหมด {totalItems} ชิ้น</strong></span></div></div><div className="detail-items">{Object.keys(booking.items).filter((key) => Number(booking.items[key]) > 0).map((key) => { const meta = getItemMeta(key); const Icon = meta.Icon; return <div key={key}><span><Icon /></span><strong>{meta.label}</strong><b>{booking.items[key]}</b></div>; })}</div></section>
          <section className="detail-section note-section"><small>หมายเหตุจากผู้ใช้งาน</small><p>{booking.notes || "ไม่มีหมายเหตุเพิ่มเติม"}</p></section>
          <section className="admin-edit-section">
            <div className="admin-edit-heading"><div><ShieldCheck /><span><strong>จัดการรายการนัดรับ</strong><small>การแก้ไขส่วนนี้จะแสดงสถานะและวันนัดใหม่ให้ผู้ใช้เห็น</small></span></div></div>
            <div className="admin-edit-grid">
              <label><span>สถานะงาน</span><select value={editStatus} onChange={(event) => setEditStatus(event.target.value as BookingRecord["status"])}><option value="pending">รอตรวจสอบ</option><option value="confirmed">ยืนยันนัดแล้ว</option><option value="en_route">กำลังเดินทาง</option><option value="completed">รับขยะแล้ว</option><option value="cancelled">ยกเลิก</option></select></label>
              <label><span>วันที่เข้ารับ</span><input type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} /></label>
              <label><span>ช่วงเวลา</span><select value={editTime} onChange={(event) => setEditTime(event.target.value)}><option value="09:00–12:00">09:00–12:00</option><option value="13:00–16:00">13:00–16:00</option></select></label>
              <label className="full"><span>หมายเหตุภายในสำหรับเจ้าหน้าที่</span><textarea value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} rows={3} maxLength={2000} placeholder="เช่น ติดต่อแล้ว ลูกค้าขอให้โทรก่อนถึง 15 นาที" /><small>ข้อมูลนี้ไม่แสดงให้ผู้ใช้งานเห็น</small></label>
            </div>
            {saveError && <div className="form-error"><CircleAlert />{saveError}</div>}
            {saved && <div className="save-success"><Check /> บันทึกการเปลี่ยนแปลงแล้ว</div>}
            <div className="admin-edit-actions"><Button onClick={saveChanges} disabled={saving || !editDate}>{saving ? <LoaderCircle className="spin" /> : <Save />} บันทึกการเปลี่ยนแปลง</Button></div>
          </section>
          <footer className="modal-footer"><span>สร้างรายการเมื่อ {new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeStyle: "short" }).format(new Date(booking.created_at))}</span><Button variant="outline" onClick={onClose}>ปิดหน้าต่าง</Button></footer>
        </div>
      </section>
    </div>
  );
}
