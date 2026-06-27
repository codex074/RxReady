# AGENTS.md — MedBackOrder Backend Integration

## Mission

โปรเจคนี้มี **Frontend Prototype จาก Claude Design อยู่แล้ว**
หน้าที่ของ AI Agent คือ **สร้าง codebase/backend/API ให้เชื่อมกับ frontend เดิมให้ใช้งานจริง**

เป้าหมายสำคัญที่สุด:

> รักษาหน้าตาเว็บเดิมให้เหมือน prototype เดิม 100%

ห้าม redesign, ห้ามเปลี่ยน layout, ห้ามเปลี่ยนสี, ห้ามเปลี่ยน spacing, ห้ามเปลี่ยน animation, ห้ามเปลี่ยน font, ห้ามเปลี่ยน visual hierarchy และห้ามสร้าง UI ใหม่ทับของเดิม

ให้แก้เฉพาะส่วนที่จำเป็นต่อการเชื่อม backend เช่น state, event handler, service call, data fetching, validation, loading state และ error state เท่านั้น

---

## Project Summary

ชื่อระบบ: **MedBackOrder**

ระบบสำหรับห้องยาใช้บันทึกใบค้างยาและสร้าง QR Code ให้ผู้ป่วยสแกนดูสถานะยาของตนเอง

Scope ปัจจุบัน:

- เจ้าหน้าที่ login
- สร้างใบค้างยา
- บันทึกข้อมูลผู้ป่วย
- บันทึกรายการยาที่ค้าง
- สร้างเลขที่ใบค้างยาอัตโนมัติ
- สร้าง public token สำหรับ QR Code
- พิมพ์ใบค้างยา/QR Code
- ผู้ป่วยสแกน QR เพื่อดูสถานะยา
- ผู้ป่วยค้นหาด้วยเลขที่ใบค้างยา + เบอร์โทร 4 หลักท้าย
- เจ้าหน้าที่อัปเดตสถานะยา
- เก็บ audit log

Out of scope:

- ห้ามทำ SMS
- ห้ามทำ SMSMKT
- ห้ามทำ LINE notification
- ห้ามทำระบบแจ้งเตือนใด ๆ
- ห้ามใช้ Firebase

---

## Tech Stack

ใช้ stack นี้เท่านั้น:

- Frontend: ใช้ frontend prototype เดิมที่มีอยู่แล้ว
- Backend Platform: Supabase
- Database: PostgreSQL
- API: Supabase Data API / PostgREST
- Auth: Supabase Auth
- Security: Row Level Security (RLS)
- Server Logic: PostgreSQL RPC หรือ Supabase Edge Functions เฉพาะจุดที่จำเป็น

ห้ามใช้:

- Firebase
- Firestore
- Firebase Auth
- Firebase Functions
- Supabase Realtime ถ้าไม่จำเป็น
- SMS/SMSMKT/LINE

---

## UI Preservation Rules

Frontend เดิมคือ source of truth ด้านหน้าตา

ห้ามเปลี่ยน:

- HTML structure ที่มีผลต่อหน้าตา
- CSS class / Tailwind class เดิม
- สี
- spacing
- border radius
- shadow
- animation
- icon
- font
- layout
- component hierarchy
- responsive behavior

อนุญาตให้เปลี่ยนเฉพาะ:

- mock data → real data
- local state → backend state
- fake submit → real API call
- fake search/filter → real query
- fake status update → real update
- เพิ่ม loading/error เฉพาะจำเป็น และต้องกลมกลืนกับ UI เดิม
- เพิ่ม service/hook/type โดยไม่กระทบ visual

ถ้าจำเป็นต้องแก้ component เดิม ให้แก้เฉพาะ logic ด้านใน component ห้ามแก้ visual class ถ้าไม่จำเป็นจริง ๆ

---

## Allowed Status Values

ใช้สถานะได้เฉพาะ 4 ค่านี้:

```ts
preparing  // กำลังเตรียมยา
ready      // พร้อมรับยา
picked_up  // รับยาแล้ว
cancelled  // ยกเลิก
```

ห้ามใช้:

```txt
pending
waiting
รอจัดหา
รอยาเข้า
```

เมื่อสร้างใบค้างยาใหม่ ให้ status เริ่มต้นเป็น:

```ts
status = "preparing"
```

---

## Required Supabase Tables

### 1. profiles

ใช้เก็บข้อมูลเจ้าหน้าที่ที่ผูกกับ Supabase Auth

```sql
profiles (
  id uuid primary key references auth.users(id),
  display_name text not null,
  email text,
  role text not null check (role in ('admin', 'pharmacist', 'staff', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

### 2. backorder_tickets

ตารางหลักของใบค้างยา

```sql
backorder_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_no text unique not null,
  public_token text unique not null,

  patient_name text not null,
  hn text,
  phone text not null,
  phone_last4 text not null,

  status text not null check (status in ('preparing', 'ready', 'picked_up', 'cancelled')),
  note text,

  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  ready_at timestamptz,
  ready_by uuid references profiles(id),

  picked_up_at timestamptz,
  picked_up_by uuid references profiles(id),

  cancelled_at timestamptz,
  cancelled_by uuid references profiles(id),
  cancel_reason text
)
```

### 3. backorder_items

รายการยาที่ค้างในแต่ละใบ

```sql
backorder_items (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references backorder_tickets(id) on delete cascade,
  drug_name text not null,
  qty numeric not null check (qty > 0),
  unit text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

### 4. audit_logs

เก็บประวัติการทำรายการ

```sql
audit_logs (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references backorder_tickets(id) on delete set null,
  ticket_no text,
  action text not null,
  old_status text,
  new_status text,
  actor_id uuid,
  actor_type text not null check (actor_type in ('staff', 'patient', 'system')),
  detail jsonb,
  created_at timestamptz not null default now()
)
```

---

## Required Backend Operations

สร้าง backend operations ต่อไปนี้ด้วย RPC หรือ Edge Functions ตามความเหมาะสม

### create_backorder_ticket

ใช้สร้างใบค้างยาใหม่

Input:

```ts
{
  patientName: string
  hn?: string
  phone: string
  items: Array<{
    drugName: string
    qty: number
    unit: string
    note?: string
  }>
  note?: string
}
```

ต้องทำ:

- ตรวจว่า user login และ active
- ตรวจ role เป็น admin/pharmacist/staff
- validate ข้อมูล
- สร้าง ticket_no รูปแบบ `BO-YYYYMMDD-XXXX`
- สร้าง public_token ที่เดายาก
- set status = `preparing`
- insert ticket
- insert items
- insert audit log action = `create_ticket`
- return ticket id, ticket_no, public_token, statusUrl

### update_ticket_status

ใช้เปลี่ยนสถานะ

Input:

```ts
{
  ticketId: string
  status: 'preparing' | 'ready' | 'picked_up' | 'cancelled'
  reason?: string
}
```

ต้องทำ:

- ตรวจว่า user login และ active
- ตรวจ role เป็น admin/pharmacist/staff
- ห้ามรับ status นอกเหนือจาก 4 ค่าที่กำหนด
- ถ้า ready ให้ set ready_at, ready_by
- ถ้า picked_up ให้ set picked_up_at, picked_up_by
- ถ้า cancelled ให้ set cancelled_at, cancelled_by, cancel_reason
- update updated_at, updated_by
- insert audit log

### get_public_status_by_token

ใช้สำหรับหน้า QR public status

Input:

```ts
{
  token: string
}
```

ไม่ต้อง login

Output ต้องจำกัดข้อมูล:

```ts
{
  found: boolean
  ticketNo?: string
  status?: 'preparing' | 'ready' | 'picked_up' | 'cancelled'
  statusText?: string
  itemsCount?: number
  updatedAt?: string
  readyAt?: string | null
  pickedUpAt?: string | null
  message?: string
}
```

ห้ามส่งออก:

- patient_name
- hn
- phone
- phone_last4
- รายละเอียดชื่อยา
- note ภายใน
- created_by
- updated_by

### lookup_ticket_status

ใช้สำหรับค้นหาด้วยเลขใบค้างยา + เบอร์โทร 4 หลักท้าย

Input:

```ts
{
  ticketNo: string
  phoneLast4: string
}
```

ไม่ต้อง login

ต้อง match ทั้ง ticket_no และ phone_last4

Output จำกัดข้อมูลเหมือน `get_public_status_by_token`

---

## Frontend Integration Files

ให้สำรวจ codebase ก่อน แล้วสร้าง/แก้ไฟล์ตามโครงสร้างจริงของโปรเจค

ไฟล์ที่คาดว่าจะต้องมี:

```txt
src/lib/supabase.ts
src/services/authService.ts
src/services/ticketService.ts
src/types/backorder.ts
src/types/database.ts
src/hooks/useTickets.ts
src/hooks/useTicketActions.ts
src/utils/status.ts
src/utils/qr.ts
supabase/migrations/001_init.sql
.env.example
```

ถ้ามีไฟล์เดิมอยู่แล้ว ให้แก้ไฟล์เดิมแทนการสร้างซ้ำ

---

## Frontend Pages To Connect

ให้ map จากหน้าเดิมของ prototype ห้ามสร้าง route ใหม่ทับ ถ้ามี route อยู่แล้วให้ใช้ของเดิม

ต้องเชื่อมอย่างน้อย:

- Login page → Supabase Auth
- Dashboard → list tickets, count by status
- Create ticket page → create_backorder_ticket
- Ticket detail page → update_ticket_status
- Print QR page → ใช้ public_token สร้าง QR URL
- Public status page `/status/:token` → get_public_status_by_token
- Lookup page → lookup_ticket_status

---

## QR Rule

QR URL ต้องใช้ public token เท่านั้น

ถูกต้อง:

```txt
/status/{public_token}
```

ห้ามใช้:

```txt
/status/{ticket_no}
```

เหตุผล: ticket_no เดาง่ายเกินไป

---

## Environment Variables

สร้าง `.env.example`

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_BASE_URL=
```

ห้ามใส่ service role key ใน frontend

---

## Security Rules

ต้องเปิด RLS ทุกตารางหลัก

หลักการ:

- profiles: user อ่าน profile ตัวเองได้, admin จัดการได้
- backorder_tickets: เฉพาะ staff ที่ login และ active อ่าน/เขียนได้
- backorder_items: เฉพาะ staff ที่ login และ active อ่าน/เขียนได้
- audit_logs: staff อ่านได้, insert ผ่าน function/RPC เท่านั้น
- public status ห้ามอ่าน table โดยตรง ให้ผ่าน RPC/Edge Function ที่คืนข้อมูลจำกัดเท่านั้น

ห้ามใช้ policy แบบเปิดกว้าง:

```sql
using (true)
with check (true)
```

ยกเว้นมีเหตุผลเฉพาะและต้อง comment ชัดเจน

---

## Implementation Order

ทำตามลำดับนี้

1. อ่าน AGENTS.md ทั้งหมด
2. สำรวจ frontend prototype และสรุป route/component ที่มีอยู่
3. สร้าง Supabase client และ env example
4. สร้าง SQL migration: tables, indexes, functions, RLS
5. สร้าง service layer สำหรับ frontend
6. แทน mock data ด้วย backend data
7. เชื่อม create ticket
8. เชื่อม status update
9. เชื่อม QR/public status
10. เชื่อม lookup
11. เพิ่ม audit log
12. ทดสอบทุก flow

---

## Testing Checklist

ต้องทดสอบอย่างน้อย:

- Login staff สำเร็จ
- สร้างใบค้างยาได้
- ticket_no ถูกสร้างอัตโนมัติ
- public_token ถูกสร้างและไม่ซ้ำ
- QR เปิดหน้า public status ได้
- public status ไม่แสดงข้อมูลส่วนตัวเกินจำเป็น
- lookup ด้วย ticket_no + phone_last4 ถูกต้อง
- lookup ด้วย phone_last4 ผิด ต้องไม่พบ
- เปลี่ยนสถานะเป็น ready ได้
- เปลี่ยนสถานะเป็น picked_up ได้
- cancelled พร้อมเหตุผลได้
- audit log ถูกสร้าง
- reload หน้าแล้วข้อมูลยังอยู่
- UI เหมือนเดิม ไม่เปลี่ยนหน้าตา prototype

---

## Final Response Required From AI Agent

หลังทำเสร็จ ให้สรุปเป็นภาษาไทย:

- สำรวจพบหน้า/route อะไรบ้าง
- ไฟล์ที่สร้าง
- ไฟล์ที่แก้
- database migration ที่เพิ่ม
- RPC/Function ที่เพิ่ม
- วิธีตั้งค่า Supabase
- วิธีตั้งค่า `.env`
- วิธี run local
- วิธี deploy
- วิธีทดสอบ flow หลัก
- จุดที่ยังต้องให้ผู้ใช้เติมเอง เช่น Supabase URL/Anon Key

