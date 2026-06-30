# Drug Receive → Auto-Ready Design

**Date:** 2026-06-30  
**Branch:** feature/drug-receive-auto-ready  
**Status:** Approved for implementation

---

## Problem

ปัจจุบันเภสัชกรต้องกดเปลี่ยนสถานะเป็น "พร้อมรับยา" ทีละใบด้วยตัวเอง เมื่อรับยาเข้าสต็อก
ต้องการ flow ที่กรอกจำนวนยาที่รับเข้าครั้งเดียว แล้วระบบจัดการเปลี่ยนสถานะให้อัตโนมัติตาม FIFO

---

## User Flow

1. เภสัชกรรับยาเข้าสต็อก (เช่น Amoxicillin 80 เม็ด)
2. เปิดหน้า **ยาค้างคนไข้** (OutstandingDrugsPage)
3. กดปุ่ม **"รับยาเข้า"** ที่การ์ดของยานั้น
4. กรอกจำนวนที่รับเข้า → ระบบแสดง preview
5. กดยืนยัน → ระบบ allocate FIFO และเปลี่ยนสถานะอัตโนมัติ

---

## FIFO Allocation Rules

- เรียงผู้ป่วยตาม `ticket.created_at ASC` (ออกใบก่อน = ได้ก่อน)
- จ่ายให้ครบตามที่ขาด (`qty - received_qty`) ทีละราย จนหมด qty ที่รับเข้า
- ถ้า qty ที่รับเข้า **เกิน** ยอดค้างทั้งหมด → จ่ายให้ครบทุกคนแล้วจบ ไม่เก็บส่วนเกิน
- ถ้า ticket มี **หลายรายการยา** และยาบางตัวยังไม่มา:
  - อัปเดต `received_qty` บน item นั้น
  - **ยังไม่** เปลี่ยนสถานะ ticket เป็น `ready`
  - เมื่อ **ทุก item** ใน ticket มี `received_qty >= qty` → เปลี่ยนเป็น `ready` อัตโนมัติ

---

## Database Changes

### Migration 012: `receive_drug_stock`

```sql
-- เพิ่ม column เดียว
ALTER TABLE backorder_items
  ADD COLUMN received_qty numeric NOT NULL DEFAULT 0
  CHECK (received_qty >= 0);

-- Function ใหม่
CREATE OR REPLACE FUNCTION public.receive_drug_stock(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER ...
```

**Input payload:**
```json
{ "drugName": "Amoxicillin", "unit": "เม็ด", "qtyReceived": 80 }
```

**Return:**
```json
{
  "readyTicketIds": ["uuid1", "uuid2", "uuid3", "uuid4"],
  "partialTicketIds": ["uuid5"],
  "qtyAllocated": 80
}
```

**ขั้นตอนใน function:**
1. `assert_active_staff()` — ต้อง authenticated
2. Validate: `drugName` ไม่ว่าง, `qtyReceived > 0`
3. Lock และดึง items: `drug_name ILIKE $1 AND unit = $2`, ticket status IN `('preparing')`, `qty - received_qty > 0`, เรียง `ticket.created_at ASC`
4. FIFO loop: คำนวณ `give = MIN(need, remaining)` → `UPDATE backorder_items SET received_qty = received_qty + give`
5. ตรวจแต่ละ ticket ที่ถูก touch: ถ้า ALL items ครบ → `UPDATE status = 'ready', ready_at = now()`
6. INSERT audit_log สำหรับทุก ticket ที่เปลี่ยนเป็น ready (detail: `{source: 'drug_receipt'}`)
7. Return result

---

## TypeScript Changes

### `src/types/database.ts`
```ts
export type BackorderItemRow = {
  // ... existing fields
  received_qty: number; // NEW
};
```

### `src/types/backorder.ts`
```ts
export type TicketItem = {
  // ... existing fields
  receivedQty?: number; // NEW
};
```

### `src/services/ticketService.ts`
- `mapTicket()` — map `item.received_qty` → `receivedQty`
- เพิ่ม `receiveDrugStock(drugName, unit, qty)` → เรียก RPC `receive_drug_stock`

---

## UI Changes

### `src/pages/OutstandingDrugsPage.tsx`
- เพิ่ม prop `onReceiveDrug?: (drugName: string, unit: string) => void`
- เพิ่มปุ่ม **"รับยาเข้า"** ในแถวหัวของแต่ละ drug card (แสดงเฉพาะเมื่อ `preparingQty > 0`)
- Wire ปุ่มไปเปิด `DrugReceiveModal`

### `src/components/DrugReceiveModal.tsx` (ใหม่)

```
┌─────────────────────────────────────────┐
│ รับยาเข้า: Amoxicillin (เม็ด)           │
│                                         │
│ จำนวนที่รับเข้า  [ 80      ] เม็ด        │
│                                         │
│ ─────────── ผลที่จะเกิดขึ้น ──────────── │
│                                         │
│ ✅ พร้อมรับยา (4 ราย)                   │
│    · นายสมชาย  BO-20260630-0001  20 เม็ด│
│    · ...                                │
│                                         │
│ ⏳ ตัดจำนวนแล้ว รอยาอื่นในใบ (1 ราย)   │
│    · นายสมศักดิ์ BO-20260630-0005       │
│      Amoxicillin 20 เม็ด ✓              │
│      Ibuprofen 10 เม็ด ⏳               │
│                                         │
│        [ยกเลิก]  [ยืนยันรับยาเข้า]      │
└─────────────────────────────────────────┘
```

**Preview logic (client-side):**
- รับ `tickets` จาก props ที่โหลดอยู่แล้ว
- จำลอง FIFO allocation เหมือน RPC แต่ใน memory
- อัปเดต preview แบบ real-time ทุกครั้งที่ตัวเลขเปลี่ยน
- ถ้า qty ≥ ยอดค้างทั้งหมด → แสดง "ครบทุกรายที่ค้าง (X ราย)"

**หลังกดยืนยัน:**
1. เรียก `ticketService.receiveDrugStock(drugName, unit, qty)`
2. ปิด modal
3. รีเฟรช ticket list
4. Toast: "เปลี่ยนสถานะพร้อมรับ N ราย · ตัดจำนวน M ราย"

---

## Files to Change

| ไฟล์ | ประเภท |
|------|--------|
| `supabase/migrations/012_receive_drug_stock.sql` | ใหม่ |
| `src/types/database.ts` | แก้ไข |
| `src/types/backorder.ts` | แก้ไข |
| `src/services/ticketService.ts` | แก้ไข |
| `src/components/DrugReceiveModal.tsx` | ใหม่ |
| `src/pages/OutstandingDrugsPage.tsx` | แก้ไข |

---

## Error Handling

| กรณี | การจัดการ |
|------|----------|
| `qtyReceived <= 0` | RPC raise exception, modal แสดง error |
| `drugName` ว่าง | ไม่สามารถเปิด modal ได้ (ปุ่มจะ disabled) |
| ไม่มีคนค้างยานี้ | Preview แสดง "ไม่มีรายการค้างสำหรับยานี้" |
| Network error ตอน confirm | Toast error, ไม่มีการเปลี่ยนแปลงใน DB (atomic) |
| qty เกินยอดค้างทั้งหมด | จ่ายครบทุกคน ไม่เก็บส่วนเกิน |

---

## Out of Scope

- ไม่มีหน้า stock management
- ไม่เก็บ stock คงเหลือ
- ไม่มี notification ส่ง SMS/LINE ให้ผู้ป่วย (feature แยก)
- ไม่แก้ไข `received_qty` ย้อนหลัง (ถ้าต้องการต้องทำ manual ผ่าน ticket detail)
