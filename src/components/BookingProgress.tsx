import { CalendarCheck, Check, CircleEllipsis, PackageCheck, Truck } from "lucide-react";

import type { BookingStatus } from "@/types";

const steps = [
  { status: "pending", label: "ส่งคำขอแล้ว", detail: "รอเจ้าหน้าที่ตรวจสอบ", Icon: CircleEllipsis },
  { status: "confirmed", label: "ยืนยันนัดรับ", detail: "วันและเวลาถูกยืนยันแล้ว", Icon: CalendarCheck },
  { status: "en_route", label: "กำลังเดินทาง", detail: "เจ้าหน้าที่กำลังไปยังจุดรับ", Icon: Truck },
  { status: "completed", label: "รับขยะแล้ว", detail: "ดำเนินการรับเรียบร้อย", Icon: PackageCheck },
] as const;

export function BookingProgress({ status, compact = false }: { status: BookingStatus; compact?: boolean }) {
  const currentIndex = steps.findIndex((step) => step.status === status);

  if (status === "cancelled") {
    return (
      <div className="progress-cancelled" role="status">
        <span>!</span>
        <div><strong>รายการนี้ถูกยกเลิก</strong><small>หากต้องการนัดหมายใหม่ กรุณาสร้างรายการอีกครั้ง</small></div>
      </div>
    );
  }

  return (
    <ol className={compact ? "booking-progress compact" : "booking-progress"} aria-label="ขั้นตอนการรับขยะ">
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        const Icon = step.Icon;
        return (
          <li key={step.status} className={done ? "done" : current ? "current" : "upcoming"} aria-current={current ? "step" : undefined}>
            <span className="progress-icon">{done ? <Check /> : <Icon />}</span>
            <div><strong>{step.label}</strong><small>{step.detail}</small></div>
          </li>
        );
      })}
    </ol>
  );
}
