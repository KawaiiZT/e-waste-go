# E-Waste Go — Production Web App

ระบบนัดรับขยะอิเล็กทรอนิกส์สำหรับใช้งานบนคอมพิวเตอร์ ประกอบด้วยฝั่งผู้ใช้งาน ฝั่งเจ้าหน้าที่ API และฐานข้อมูลจริง

## ความสามารถ

- ผู้ใช้กรอกชื่อ เบอร์โทร ที่อยู่ รายการขยะ วันและเวลานัดรับ
- บันทึกข้อมูลลง Supabase PostgreSQL ผ่าน Server API
- ผู้ใช้ตรวจสอบสถานะด้วยเลขนัดหมายและเบอร์โทรศัพท์
- เจ้าหน้าที่ล็อกอินและดูรายการนัดรับทั้งหมด
- กรองสถานะและค้นหาด้วยเลขนัดหมาย ชื่อ หรือเบอร์โทร
- Secret Key และรหัสผ่าน Admin อยู่ฝั่ง Server เท่านั้น

## เทคโนโลยี

- React + TypeScript + Vite
- Vercel Functions ในโฟลเดอร์ `api/`
- Supabase PostgreSQL
- Admin session แบบ signed HttpOnly cookie

## 1. สร้างฐานข้อมูล Supabase

1. สร้าง Project ที่ https://supabase.com
2. เปิด **SQL Editor**
3. คัดลอก SQL จาก `supabase/schema.sql` ไปรัน
4. เปิด **Project Settings > API Keys**
5. คัดลอก Project URL และ Secret Key ที่ขึ้นต้นด้วย `sb_secret_`

Secret Key มีสิทธิ์สูง ห้ามใส่ในโค้ด Frontend หรือ commit ลง Git

## 2. ตั้งค่า Environment Variables

คัดลอก `.env.example` เป็น `.env.local` สำหรับทดสอบในเครื่อง หรือเพิ่มค่าต่อไปนี้ใน Vercel:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_REPLACE_ME
ADMIN_PASSWORD=CHANGE_TO_A_LONG_RANDOM_PASSWORD
SESSION_SECRET=CHANGE_TO_AT_LEAST_32_RANDOM_CHARACTERS
```

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
4. เพิ่ม Environment Variables ทั้ง 4 ค่า
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
supabase/
  schema.sql           ตารางและข้อกำหนดฐานข้อมูล
```

## ก่อนเปิดใช้งานจริง

- ตั้งรหัสผ่าน Admin ที่ยาวและไม่ซ้ำบริการอื่น
- เปิด Deployment Protection สำหรับ Preview Deployments
- ตั้ง Rate Limiting หรือ Firewall Rule ให้ `/api/bookings`
- สำรองฐานข้อมูลตามรอบเวลาที่เหมาะสม
- ทดสอบบนโดเมนจริงก่อนประชาสัมพันธ์

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
