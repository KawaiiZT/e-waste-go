import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Clock3,
  Computer,
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
  Search,
  ShieldCheck,
  Smartphone,
  UserRound,
  WashingMachine,
} from "lucide-react";
import { th } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

type ItemKey = "phone" | "laptop" | "accessory" | "appliance";
type View = "booking" | "lookup" | "success";

type BookingForm = {
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  notes: string;
  website: string;
};

type BookingRecord = {
  id?: string;
  booking_ref: string;
  customer_name?: string;
  customer_phone?: string;
  pickup_address?: string;
  pickup_date: string;
  pickup_time: string;
  items: Record<ItemKey, number>;
  notes?: string | null;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  created_at: string;
};

const itemConfig: Record<ItemKey, { label: string; Icon: typeof Smartphone }> = {
  phone: { label: "โทรศัพท์และแท็บเล็ต", Icon: Smartphone },
  laptop: { label: "คอมพิวเตอร์และโน้ตบุ๊ก", Icon: Computer },
  accessory: { label: "สายชาร์จและอุปกรณ์เสริม", Icon: Headphones },
  appliance: { label: "เครื่องใช้ไฟฟ้าขนาดเล็ก", Icon: WashingMachine },
};

const statusText = {
  pending: "รอตรวจสอบ",
  confirmed: "ยืนยันนัดแล้ว",
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
  const [form, setForm] = useState<BookingForm>({ customerName: "", customerPhone: "", pickupAddress: "", notes: "", website: "" });
  const [items, setItems] = useState<Record<ItemKey, number>>({ phone: 0, laptop: 0, accessory: 0, appliance: 0 });
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
    if (!form.customerName.trim() || !form.customerPhone.trim() || !form.pickupAddress.trim()) return setError("กรุณากรอกข้อมูลผู้ติดต่อและสถานที่รับให้ครบ");
    if (totalItems === 0) return setError("กรุณาเลือกขยะอย่างน้อย 1 ชิ้น");
    setSubmitting(true);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, items, pickupDate: toIsoDate(selectedDate), pickupTime: timeSlot }),
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
          <section className="page-intro">
            <div><span className="eyebrow">นัดรับถึงบ้าน</span><h1>ส่งต่อขยะอิเล็กทรอนิกส์อย่างถูกวิธี</h1><p>กรอกข้อมูล เลือกวันรับ และส่งคำขอให้เจ้าหน้าที่ตรวจสอบ</p></div>
            <div className="secure-note"><ShieldCheck /><span><strong>ข้อมูลส่งตรงถึงเจ้าหน้าที่</strong><small>จัดเก็บผ่านระบบฐานข้อมูลที่กำหนด</small></span></div>
          </section>

          <div className="booking-layout">
            <div className="booking-main">
              <section className="panel">
                <div className="panel-heading"><span>1</span><div><h2>ข้อมูลผู้ติดต่อ</h2><p>เจ้าหน้าที่จะใช้ข้อมูลนี้เพื่อติดต่อยืนยันนัด</p></div></div>
                <div className="form-grid">
                  <label><span>ชื่อผู้ติดต่อ *</span><div className="input-wrap"><UserRound /><input value={form.customerName} onChange={(event) => updateForm("customerName", event.target.value)} placeholder="ชื่อ-นามสกุล" autoComplete="name" /></div></label>
                  <label><span>เบอร์โทรศัพท์ *</span><div className="input-wrap"><Phone /><input value={form.customerPhone} onChange={(event) => updateForm("customerPhone", event.target.value)} placeholder="08XXXXXXXX" inputMode="tel" autoComplete="tel" /></div></label>
                  <label className="full"><span>สถานที่รับ *</span><div className="input-wrap textarea"><MapPin /><textarea value={form.pickupAddress} onChange={(event) => updateForm("pickupAddress", event.target.value)} placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด และจุดสังเกต" rows={3} autoComplete="street-address" /></div></label>
                  <label className="full"><span>หมายเหตุถึงเจ้าหน้าที่</span><textarea className="plain-textarea" value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="เช่น กรุณาโทรก่อนเข้ารับ หรือมีอุปกรณ์ชำรุดแตกหัก" rows={2} /></label>
                  <label className="honeypot" aria-hidden="true">Website<input tabIndex={-1} value={form.website} onChange={(event) => updateForm("website", event.target.value)} autoComplete="off" /></label>
                </div>
              </section>

              <section className="panel">
                <div className="panel-heading"><span>2</span><div><h2>รายการขยะอิเล็กทรอนิกส์</h2><p>ระบุจำนวนอุปกรณ์ที่ต้องการให้เข้ารับ</p></div></div>
                <div className="item-grid">
                  {(Object.keys(itemConfig) as ItemKey[]).map((key) => {
                    const { label, Icon } = itemConfig[key];
                    return (
                      <article key={key} className={items[key] > 0 ? "item-card selected" : "item-card"}>
                        <span className="item-icon"><Icon /></span><strong>{label}</strong>
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
                    <Calendar mode="single" locale={th} selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} disabled={{ before: tomorrow }} startMonth={tomorrow} className="booking-calendar" />
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
      <section className="lookup-card">
        <span className="large-icon"><Search /></span><h1>ตรวจสอบสถานะนัดรับ</h1><p>กรอกเลขนัดหมายและเบอร์โทรศัพท์ที่ใช้สร้างรายการ</p>
        <label><span>เลขนัดหมาย</span><input value={reference} onChange={(event) => setReference(event.target.value.toUpperCase())} placeholder="เช่น EW12AB34CD" /></label>
        <label><span>เบอร์โทรศัพท์</span><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="08XXXXXXXX" inputMode="tel" /></label>
        {error && <div className="form-error"><CircleAlert />{error}</div>}
        <Button onClick={lookup} disabled={loading || !reference || !phone}>{loading ? <LoaderCircle className="spin" /> : <Search />} ตรวจสอบสถานะ</Button>
        {booking && <div className="lookup-result"><div><small>เลขนัดหมาย</small><strong>{booking.booking_ref}</strong></div><span className={`status ${booking.status}`}>{statusText[booking.status]}</span><hr /><p><CalendarDays /> {new Intl.DateTimeFormat("th-TH", { dateStyle: "long" }).format(new Date(`${booking.pickup_date}T00:00:00`))}</p><p><Clock3 /> {booking.pickup_time}</p></div>}
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

  const loadBookings = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/admin/bookings?status=${status}`, { credentials: "include" });
      if (response.status === 401) { setAuthenticated(false); setBookings([]); return; }
      const result = await readApiResponse<{ bookings?: BookingRecord[]; error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "โหลดข้อมูลไม่สำเร็จ");
      setBookings(result.bookings ?? []); setAuthenticated(true);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "เกิดข้อผิดพลาด"); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadBookings(); }, [status]);

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
  const visibleBookings = bookings.filter((booking) => `${booking.booking_ref} ${booking.customer_name} ${booking.customer_phone}`.toLowerCase().includes(query.toLowerCase()));

  if (authenticated === null || (loading && !authenticated)) return <div className="fullscreen-loader"><LoaderCircle className="spin" /><span>กำลังตรวจสอบระบบ</span></div>;
  if (!authenticated) return (
    <div className="admin-login-page"><header><Brand /><a href="/"><ArrowLeft /> กลับหน้าผู้ใช้งาน</a></header><form className="admin-login-card" onSubmit={login}><span className="large-icon"><LockKeyhole /></span><h1>เข้าสู่ระบบเจ้าหน้าที่</h1><p>กรอกรหัสผ่านผู้ดูแลระบบเพื่อดูรายการนัดรับ</p><label><span>รหัสผ่าน</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" autoFocus /></label>{error && <div className="form-error"><CircleAlert />{error}</div>}<Button type="submit" disabled={loading || !password}>{loading ? <LoaderCircle className="spin" /> : <LockKeyhole />} เข้าสู่ระบบ</Button></form></div>
  );

  return (
    <div className="admin-page">
      <header className="admin-header"><Brand /><div><a href="/"><UserRound /> หน้าผู้ใช้งาน</a><button onClick={logout}><LogOut /> ออกจากระบบ</button></div></header>
      <main className="admin-workspace">
        <section className="admin-title"><div><span className="eyebrow">ADMIN DASHBOARD</span><h1>รายการนัดรับขยะ</h1><p>ข้อมูลล่าสุดจากระบบฐานข้อมูล</p></div><Button variant="outline" onClick={loadBookings} disabled={loading}><RefreshCw className={loading ? "spin" : ""} /> รีเฟรชข้อมูล</Button></section>
        <section className="stats-row"><div><ClipboardList /><span><small>รายการทั้งหมด</small><strong>{bookings.length}</strong></span></div><div><Clock3 /><span><small>รอตรวจสอบ</small><strong>{bookings.filter((item) => item.status === "pending").length}</strong></span></div><div><PackageCheck /><span><small>รับขยะแล้ว</small><strong>{bookings.filter((item) => item.status === "completed").length}</strong></span></div></section>
        <section className="admin-panel">
          <div className="table-tools"><div className="search-box"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาเลขนัดหมาย ชื่อ หรือเบอร์โทร" /></div><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">ทุกสถานะ</option><option value="pending">รอตรวจสอบ</option><option value="confirmed">ยืนยันนัดแล้ว</option><option value="completed">รับขยะแล้ว</option><option value="cancelled">ยกเลิก</option></select></div>
          {error && <div className="form-error"><CircleAlert />{error}</div>}
          <div className="table-scroll"><table><thead><tr><th>เลขนัดหมาย</th><th>ผู้ติดต่อ</th><th>วันและเวลา</th><th>รายการ</th><th>สถานที่รับ</th><th>สถานะ</th></tr></thead><tbody>{visibleBookings.map((booking) => <tr key={booking.id ?? booking.booking_ref}><td><strong>{booking.booking_ref}</strong><small>{new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(booking.created_at))}</small></td><td><strong>{booking.customer_name}</strong><small>{booking.customer_phone}</small></td><td><strong>{new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(`${booking.pickup_date}T00:00:00`))}</strong><small>{booking.pickup_time}</small></td><td><strong>{Object.values(booking.items).reduce((sum, count) => sum + Number(count), 0)} ชิ้น</strong><small>{(Object.keys(booking.items) as ItemKey[]).filter((key) => booking.items[key] > 0).map((key) => itemConfig[key]?.label).join(", ")}</small></td><td className="address-cell">{booking.pickup_address}</td><td><span className={`status ${booking.status}`}>{statusText[booking.status]}</span></td></tr>)}</tbody></table>{!loading && visibleBookings.length === 0 && <div className="empty-state"><LayoutDashboard /><h3>ยังไม่มีรายการนัดรับ</h3><p>รายการที่ผู้ใช้ส่งเข้ามาจะแสดงในหน้านี้</p></div>}</div>
        </section>
      </main>
    </div>
  );
}
