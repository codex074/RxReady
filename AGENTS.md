# AGENTS.md — RxReady (USC+ ระบบใบค้างรับยา)

> **อ่านก่อนทำอะไรทั้งหมด**
> ไฟล์นี้คือ source of truth สำหรับ AI Agent ทุกตัวที่ทำงานใน repository นี้

---

## ⛔ กฎสำคัญที่สุด — ห้ามละเมิดโดยเด็ดขาด

```
ห้ามแก้ไข code เดิมที่มีอยู่แล้วในทุกกรณี
จนกว่าจะได้รับอนุญาตอย่างชัดเจนจากผู้ใช้
```

หมายความว่า:

- **ห้าม** แก้ไขไฟล์ที่มีอยู่แล้ว ไม่ว่าจะเป็น `.tsx`, `.ts`, `.sql`, `.json`, `.html`, `.svg` หรือไฟล์ใดก็ตาม
- **ห้าม** refactor, rename, หรือ restructure code ที่ยังไม่ได้รับคำสั่ง
- **ห้าม** "ปรับปรุง" หรือ "cleanup" โดยที่ไม่ได้ถูกขอ
- **ห้าม** เปลี่ยน UI, layout, สี, spacing, animation, font หรือ visual ใด ๆ โดยไม่ได้รับอนุญาต
- **ห้าม** เพิ่ม dependency ใหม่โดยไม่ได้รับอนุญาต

ถ้าเห็นว่ามีปัญหาหรือจุดที่ควรปรับปรุง → **แจ้งผู้ใช้ก่อน รอการอนุมัติ แล้วค่อยแก้**

---

## สถานะปัจจุบันของโปรเจกต์

ระบบนี้ **พัฒนาเสร็จแล้วและใช้งาน production** แล้ว

- Frontend + Backend เชื่อมกันสมบูรณ์
- Supabase migrations ทั้งหมด 11 ไฟล์ถูก apply แล้ว
- Deploy บน Vercel ที่ `usc-rxready.vercel.app`

**งาน AI Agent ใน repo นี้คือ**: เพิ่มฟีเจอร์ใหม่ / แก้ bug / ปรับปรุงตามที่ได้รับคำสั่ง เท่านั้น

---

## Project Overview

| รายการ | ค่า |
|--------|-----|
| ชื่อระบบ | **RxReady — ระบบใบค้างรับยา USC+** |
| หน่วยงาน | กลุ่มงานเภสัชกรรม โรงพยาบาลอุตรดิตถ์ กระทรวงสาธารณสุข |
| ผู้ใช้หลัก | เจ้าหน้าที่ห้องยา และผู้ป่วย |
| ภาษา UI | ภาษาไทยทั้งหมด |
| Deploy | Vercel (SPA) |
| Backend | Supabase (PostgreSQL + Auth + RLS) |

---

## Tech Stack (ที่ใช้จริงอยู่)

```
Frontend                 Backend (Supabase)        Build
──────────────────       ──────────────────        ──────────────
React 19                 PostgreSQL                Vite 7
TypeScript 5.9           Row Level Security        Tailwind CSS 4
SweetAlert2 11           Supabase Auth             @tailwindcss/vite
QRCode.js                pgcrypto
xlsx                     pg functions / RPC
```

**ห้ามเพิ่ม library ใหม่นอกจากนี้โดยไม่ได้รับอนุมัติก่อน**

---

## โครงสร้างไฟล์ (สรุป)

```
usc-bod/
├── public/favicon.svg               # Favicon (mortar & pestle + green cross)
├── assets/
│   ├── usc-logo.png / utth-logo.png / moph-logo.png
│   └── user.json                    # ข้อมูล seed ผู้ใช้ 109 คน
├── src/
│   ├── lib/supabase.ts              # Supabase client — sessionStorage session
│   ├── services/
│   │   ├── authService.ts           # login / logout / profile
│   │   ├── ticketService.ts         # CRUD ใบค้างรับยา
│   │   ├── drugService.ts           # CRUD คลังยา
│   │   ├── userService.ts           # admin จัดการผู้ใช้
│   │   └── auditService.ts          # ดึง audit log
│   ├── pages/                       # 12 หน้า (อย่าเพิ่ม/ลบโดยไม่ได้รับอนุญาต)
│   ├── components/                  # StaffShell, StatusBadge, EditProfileModal, Icon
│   ├── types/                       # backorder, database, drug, user, audit, navigation
│   ├── utils/                       # name.ts, qr.ts, status.ts
│   └── App.tsx                      # Root + routing ทั้งหมด
├── supabase/migrations/             # 001–011 (อย่า drop/alter โดยไม่ได้รับอนุญาต)
├── index.html
├── vercel.json
└── AGENTS.md  ← ไฟล์นี้
```

---

## Database Schema (สถานะปัจจุบัน)

### ตาราง profiles

```sql
profiles (
  id          uuid primary key references auth.users(id),
  username    text unique not null,          -- ชื่อผู้ใช้ lowercase
  prefix      text not null default '',      -- คำนำหน้า เช่น ภญ., นาย
  f_name      text not null default '',      -- ชื่อจริง
  l_name      text not null default '',      -- นามสกุล
  role        text not null check (role in ('admin', 'sub-admin', 'staff')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
)
```

> ⚠️ roles ที่ถูกต้องคือ `admin`, `sub-admin`, `staff` เท่านั้น
> (`pharmacist` และ `viewer` ถูก migrate ออกไปแล้วใน migration 008)

### ตาราง backorder_tickets

```sql
backorder_tickets (
  id           uuid primary key,
  ticket_no    text unique not null,   -- รูปแบบ BO-YYYYMMDD-NNNN
  public_token text unique not null,   -- ใช้ใน QR URL เท่านั้น
  patient_name text not null,
  hn           text,
  phone        text not null,
  phone_last4  text not null,
  status       text not null check (status in ('preparing','ready','picked_up','cancelled')),
  note         text,
  created_by   uuid references profiles(id),
  updated_by   uuid references profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  ready_at     timestamptz,
  ready_by     uuid references profiles(id),
  picked_up_at timestamptz,
  picked_up_by uuid references profiles(id),
  cancelled_at timestamptz,
  cancelled_by uuid references profiles(id),
  cancel_reason text
)
```

### ตาราง backorder_items

```sql
backorder_items (
  id        uuid primary key,
  ticket_id uuid not null references backorder_tickets(id) on delete cascade,
  drug_name text not null,
  qty       numeric not null check (qty > 0),
  unit      text not null,
  note      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

### ตาราง drugs

```sql
drugs (
  id           uuid primary key,
  name         text not null,
  generic_name text,
  strength     text,
  unit         text,
  price        numeric,
  color_tag    text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
)
-- มียาประมาณ 1,300+ รายการ seed จาก migration 005
-- GIN index สำหรับ full-text search
```

### ตาราง audit_logs

```sql
audit_logs (
  id         uuid primary key,
  ticket_id  uuid references backorder_tickets(id) on delete set null,
  ticket_no  text,
  action     text not null,
  old_status text,
  new_status text,
  actor_id   uuid,
  actor_type text not null check (actor_type in ('staff','patient','system')),
  detail     jsonb,
  created_at timestamptz not null default now()
)
```

---

## Roles & Permissions

| Role | จัดการผู้ใช้ | จัดการยา | ใบค้างรับยา | Audit Log |
|------|:-----------:|:--------:|:-----------:|:---------:|
| `admin` | ✅ | ✅ | ✅ สร้าง/แก้/ลบ | ✅ ดูได้ |
| `sub-admin` | ❌ | ✅ | ✅ สร้าง/แก้ | ❌ |
| `staff` | ❌ | ❌ (ดูได้) | ✅ สร้าง/แก้ | ❌ |

Permission บังคับโดย PostgreSQL RLS functions:
- `is_active_staff()` — admin, sub-admin, staff ที่ is_active = true
- `is_admin()` — admin ที่ is_active = true
- `is_drug_manager()` — admin หรือ sub-admin ที่ is_active = true

---

## Auth System

- Login ด้วย **username + PIN** เท่านั้น
- Internal Supabase email identity: `{username}@usc-rxready.vercel.app` — **ห้ามแสดงใน UI**
- Internal password format: `RxReady#{PIN}` — **ห้าม hardcode ใน source code**
- Session เก็บใน **`sessionStorage`** (ปิด browser = logout อัตโนมัติ)
- ห้ามมี sign-up สาธารณะ — เจ้าหน้าที่ใหม่สร้างโดย admin เท่านั้น
- Default role หลังสร้าง user = `staff` (กำหนดใน trigger ฝั่ง DB)

---

## Routing

| Route | Component | Auth |
|-------|-----------|------|
| `/` | LoginPage หรือ Dashboard (ถ้า session ยังอยู่) | — |
| `/` (authed) | DashboardPage | staff ขึ้นไป |
| `/status/:token` | PublicStatusPage | ไม่ต้อง login |

`vercel.json` redirect ทุก path → `/index.html` สำหรับ SPA

---

## Status Values

ใช้ได้เฉพาะ 4 ค่า:

```
preparing   กำลังเตรียมยา   (สถานะเริ่มต้น)
ready       พร้อมรับยา
picked_up   รับยาแล้ว
cancelled   ยกเลิก
```

ห้ามใช้: `pending`, `waiting`, `รอจัดหา`, `รอยาเข้า`

---

## QR Code Rule

URL ใน QR Code ต้องใช้ `public_token` เสมอ:

```
✅ /status/{public_token}
❌ /status/{ticket_no}      ← ticket_no เดาได้ง่ายเกินไป
```

---

## Environment Variables

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_APP_BASE_URL=https://usc-rxready.vercel.app
```

- **ห้าม** ใส่ `SUPABASE_SERVICE_ROLE_KEY` ใน frontend ทุกกรณี
- **ห้าม** commit `.env` จริงลง repository

---

## Security Rules

- RLS เปิดอยู่ทุกตาราง — ห้ามปิดหรือ bypass
- ห้ามใช้ policy `using (true)` / `with check (true)` โดยไม่มีเหตุผลและ comment
- Public status endpoint คืนข้อมูลจำกัด — **ห้ามส่ง** `patient_name`, `hn`, `phone`, `phone_last4`, รายละเอียดยา, `note`, `created_by`, `updated_by`
- ห้ามส่ง service role key กลับไปยัง frontend

---

## Migrations (สถานะปัจจุบัน — apply แล้วทั้งหมด)

| # | ไฟล์ | สถานะ |
|---|------|-------|
| 001 | `init.sql` | ✅ applied |
| 002 | `username_auth.sql` | ✅ applied |
| 003 | `fix_token_no_pgcrypto.sql` | ✅ applied |
| 004 | `rename_ticket_prefix.sql` | ✅ applied |
| 005 | `drugs_table_and_seed.sql` | ✅ applied |
| 006 | `self_update_profile.sql` | ✅ applied |
| 007 | `lookup_by_date.sql` | ✅ applied |
| 008 | `role_profile_revamp.sql` | ✅ applied |
| 009 | `audit_trail.sql` | ✅ applied |
| 010 | `audit_log_retention.sql` | ✅ applied |
| 011 | `seed_users_from_json.sql` | ✅ applied |

Migration ใหม่ต้องใช้หมายเลขถัดไป (`012_...`) และต้องได้รับอนุญาตก่อน

---

## สิ่งที่ห้ามทำในทุกกรณี

- ❌ SMS / SMSMKT / LINE notification
- ❌ Firebase (ทุก product)
- ❌ Supabase Realtime (ถ้าไม่ได้รับอนุญาต)
- ❌ Sign-up สาธารณะ
- ❌ แสดง email จริงหรือ internal email ใน UI
- ❌ เปลี่ยนโครงสร้างตารางที่มีอยู่โดยไม่ได้รับอนุญาต
- ❌ Drop หรือ alter migration ที่ apply ไปแล้ว
- ❌ เปลี่ยน visual/UI โดยไม่ได้รับคำสั่ง
- ❌ Refactor code เดิมโดยที่ไม่ได้ถูกขอ
- ❌ เพิ่ม comment หรือ console.log ที่ไม่จำเป็น
- ❌ แก้ AGENTS.md นี้โดยไม่ได้รับอนุญาต
