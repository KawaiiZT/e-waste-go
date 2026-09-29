# E-Waste Go — Production Web App

ระบบนัดรับขยะอิเล็กทรอนิกส์สำหรับใช้งานบนคอมพิวเตอร์ ประกอบด้วยฝั่งผู้ใช้งาน ฝั่งเจ้าหน้าที่ API และฐานข้อมูลจริง

เวอร์ชันปัจจุบัน: `1.4.1` (Location Picker, Route, Status Timeline และหมวดอุปกรณ์ตามขนาด)

## ความสามารถ

- ผู้ใช้เลือกจุดรับบน OpenStreetMap หรือใช้ตำแหน่งปัจจุบัน โดยไม่ต้องกรอกบ้านเลขที่
- เพิ่มรายละเอียดจุดรับสั้น ๆ เช่น อาคาร ชั้น หรือจุดสังเกตได้
- บันทึกข้อมูลลง Supabase PostgreSQL ผ่าน Server API
- ผู้ใช้ตรวจสอบสถานะเป็นขั้นตอน พร้อม Route จากศูนย์รับไปยังจุดรับ
- เจ้าหน้าที่ล็อกอินและดูรายการนัดรับทั้งหมด
- กรองสถานะและค้นหาด้วยเลขนัดหมาย ชื่อ หรือเบอร์โทร
- เจ้าหน้าที่ดูพิกัดและ Route พร้อมเปลี่ยนสถานะเป็น รอตรวจสอบ / ยืนยัน / กำลังเดินทาง / รับแล้ว / ยกเลิก
- ส่งออกรายการที่ค้นหา/กรองอยู่เป็นไฟล์ CSV
- Secret Key และรหัสผ่าน Admin อยู่ฝั่ง Server เท่านั้น

## เทคโนโลยี

- React + TypeScript + Vite
- Vercel Functions ในโฟลเดอร์ `api/`
- Supabase PostgreSQL
- Leaflet + OpenStreetMap และ OSRM สำหรับคำนวณเส้นทาง
- Admin session แบบ signed HttpOnly cookie

## 1. สร้างฐานข้อมูล Supabase

1. สร้าง Project ที่ https://supabase.com
2. เปิด **SQL Editor**
3. คัดลอก SQL จาก `supabase/schema.sql` ไปรัน
4. เปิด **Project Settings > API Keys**
5. คัดลอก Project URL และ Secret Key ที่ขึ้นต้นด้วย `sb_secret_`

Secret Key มีสิทธิ์สูง ห้ามใส่ในโค้ด Frontend หรือ commit ลง Git

หากเป็น Project เดิมที่มีตาราง `bookings` อยู่แล้ว ให้นำไฟล์
`supabase/migration_v1.3.0.sql` ไปรันใน SQL Editor หนึ่งครั้งก่อน Deploy เวอร์ชันนี้

## 2. ตั้งค่า Environment Variables

คัดลอก `.env.example` เป็น `.env.local` สำหรับทดสอบในเครื่อง หรือเพิ่มค่าต่อไปนี้ใน Vercel:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_REPLACE_ME
ADMIN_PASSWORD=CHANGE_TO_A_LONG_RANDOM_PASSWORD
SESSION_SECRET=CHANGE_TO_AT_LEAST_32_RANDOM_CHARACTERS
VITE_DEPOT_LAT=13.000000
VITE_DEPOT_LNG=100.000000
VITE_DEPOT_NAME=ศูนย์รับขยะอิเล็กทรอนิกส์
```

เปลี่ยน `VITE_DEPOT_LAT` และ `VITE_DEPOT_LNG` ให้เป็นพิกัดจริงของจุดเริ่มต้นทีมรับขยะ ค่าเหล่านี้ใช้สร้าง Route ไปยังหมุดของผู้ใช้ และเป็นข้อมูลสาธารณะที่รวมอยู่ใน Frontend จึงไม่ควรใส่ข้อมูลลับ

สร้าง `SESSION_SECRET` ด้วยคำสั่ง:

```bash
openssl rand -base64 48
```

## 3. เปิดบนเครื่อง

```bash
npm install
npm run dev
```

หน้า User: `http://localhost:5173/`

หน้า Admin: `http://localhost:5173/admin`

หมายเหตุ: การทดสอบ API ในเครื่องด้วย Vite เพียงอย่างเดียวจะยังไม่เรียก Vercel Functions ให้ใช้ `vercel dev` เมื่อต้องการทดสอบระบบครบทั้ง Frontend และ API

```bash
npm install -g vercel
vercel dev
```

## 4. Deploy บน Vercel

1. นำโฟลเดอร์โปรเจกต์ขึ้น GitHub
2. Import Repository ใน Vercel
3. Framework Preset เลือก **Vite**
4. เพิ่ม Environment Variables ทั้ง 7 ค่า
5. กด Deploy
6. ทดลองสร้างนัดหมายจาก `/`
7. เปิด `/admin` และล็อกอินด้วยค่า `ADMIN_PASSWORD`

## โครงสร้างสำคัญ

```text
api/
  bookings.ts          สร้างและตรวจสอบนัดหมาย
  admin/login.ts       เข้าสู่ระบบเจ้าหน้าที่
  admin/logout.ts      ออกจากระบบเจ้าหน้าที่
  admin/bookings.ts    อ่านรายการนัดหมาย
server/
  session.ts           ตรวจสอบ Admin session
  supabase.ts          เชื่อม Supabase REST API
src/
  App.tsx              UI ฝั่งผู้ใช้และ Admin
  components/PickupMap.tsx  แผนที่เลือกตำแหน่งและ Route
  components/BookingProgress.tsx  ขั้นตอนสถานะงาน
supabase/
  schema.sql           ตารางและข้อกำหนดฐานข้อมูล
  migration_v1.3.0.sql เพิ่มพิกัดและสถานะกำลังเดินทางให้ฐานข้อมูลเดิม
```

## ก่อนเปิดใช้งานจริง

- ตั้งรหัสผ่าน Admin ที่ยาวและไม่ซ้ำบริการอื่น
- เปิด Deployment Protection สำหรับ Preview Deployments
- ตั้ง Rate Limiting หรือ Firewall Rule ให้ `/api/bookings`
- สำรองฐานข้อมูลตามรอบเวลาที่เหมาะสม
- ทดสอบบนโดเมนจริงก่อนประชาสัมพันธ์
- OpenStreetMap และ OSRM ที่ตั้งค่าไว้เป็นบริการสาธารณะ เหมาะกับปริมาณใช้งานช่วงเริ่มต้น หากมีผู้ใช้จำนวนมากควรเปลี่ยนเป็นผู้ให้บริการแผนที่/Route ที่มี SLA หรือโฮสต์เอง

## แก้ปัญหา API ตอบกลับไม่ใช่ JSON

หากหน้าเว็บแจ้งว่าเซิร์ฟเวอร์ขัดข้อง ให้เปิด `https://โดเมนของคุณ/api/health`
ซึ่งควรตอบกลับเป็น JSON ดังนี้:

```json
{"ok":true,"service":"e-waste-go"}
```

ถ้า Health API ไม่ทำงาน ให้เปิด **Vercel > Project > Logs** แล้วเลือก Runtime Logs
ของ request ที่ล้มเหลว หาก Health API ทำงานแต่บันทึกนัดหมายไม่ได้ ให้ตรวจสอบว่า Environment
Variables `SUPABASE_URL` และ `SUPABASE_SECRET_KEY` ถูกเพิ่มใน Environment ของ Deployment
แล้ว จากนั้นกด Redeploy อีกครั้ง

## แก้ปัญหาแผนที่เป็นสีเทา

ไฟล์ `vercel.json` เวอร์ชัน 1.3.1 อนุญาตให้เว็บไซต์โหลดภาพแผนที่จาก OpenStreetMap,
เรียก Route จาก OSRM และขอสิทธิ์ตำแหน่งจากผู้ใช้แล้ว หากเพิ่งอัปเดตไฟล์ ให้ Push ขึ้น GitHub
และ Redeploy บน Vercel ก่อน จากนั้นเปิดหน้าเว็บใหม่ด้วย Hard Refresh (`Ctrl+Shift+R`)
