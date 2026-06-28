<div align="center">

# 💊 RxReady — ระบบใบค้างรับยา USC+

**ระบบบริหารจัดการใบค้างรับยาออนไลน์**  
กลุ่มงานเภสัชกรรม โรงพยาบาลอุตรดิตถ์

[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=white&labelColor=20232a)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-7-646cff?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-000?style=flat-square&logo=vercel)](https://vercel.com)

</div>

---

## ✨ ภาพรวม

RxReady ช่วยให้เจ้าหน้าที่ห้องยาออกใบค้างรับยาได้รวดเร็ว พร้อม QR Code สำหรับผู้ป่วยตรวจสอบสถานะได้เองทุกที่ทุกเวลา โดยไม่ต้องโทรถามห้องยา

```
ผู้ป่วย                เจ้าหน้าที่              ระบบ
   │                      │                    │
   │  สแกน QR / ค้นหา    │  ออกใบค้างรับยา  │  ออกเลขที่อัตโนมัติ
   │─────────────────────>│─────────────────>│  สร้าง QR Code
   │                      │  อัปเดตสถานะ     │  บันทึก Audit Log
   │<─────────────────────│─────────────────>│
   │  ดูสถานะแบบ real-time│                    │
```

---

## 🚀 ฟีเจอร์หลัก

### 🏥 สำหรับเจ้าหน้าที่
| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| 📋 ออกใบค้างรับยา | บันทึกข้อมูลผู้ป่วย รายการยา พร้อมเลขที่และ QR Code อัตโนมัติ |
| 🔄 อัปเดตสถานะ | กำลังเตรียมยา → พร้อมรับ → รับยาแล้ว / ยกเลิก |
| 🔍 ค้นหาใบค้างรับยา | ค้นตามชื่อผู้ป่วย เลขที่ใบ หรือกรองตามสถานะ |
| 💊 ยาค้างรับ | Dashboard รวมยาที่ยังค้างอยู่ทุกใบในวันนั้น |
| 🖨️ พิมพ์ QR | พิมพ์ใบค้างรับยาพร้อม QR Code สำหรับผู้ป่วย |

### 👤 สำหรับผู้ป่วย
| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| 📱 สแกน QR Code | ดูสถานะยาผ่าน QR โดยไม่ต้อง login |
| 🔎 ค้นหาด้วยเลขใบ | ค้นจากวันที่รับบริการ + เบอร์โทร 4 หลักท้าย |

### 🛠️ สำหรับผู้ดูแลระบบ
| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| 💊 จัดการคลังยา | เพิ่ม/แก้ไข/ลบรายการยา พร้อม autocomplete ตอนออกใบ |
| 👥 จัดการผู้ใช้ | เพิ่มเจ้าหน้าที่ ปิด/เปิดบัญชี รีเซ็ตรหัสผ่าน |
| 📊 Audit Log | ประวัติทุกการกระทำในระบบพร้อมผู้กระทำและเวลา |

---

## 🏗️ Tech Stack

```
Frontend          Backend (Supabase)     Tools
──────────────    ──────────────────     ──────────────
React 19          PostgreSQL (RLS)       Vite 7
TypeScript 5.9    Row Level Security     Tailwind CSS 4
SweetAlert2       pg functions           QRCode.js
xlsx (export)     pgcrypto              
```

---

## 📁 โครงสร้างโปรเจกต์

```
usc-bod/
├── public/
│   └── favicon.svg              # Favicon ครกยา + Green Cross
├── assets/
│   ├── usc-logo.png
│   ├── utth-logo.png
│   ├── moph-logo.png
│   └── user.json                # ข้อมูลผู้ใช้สำหรับ seed
├── src/
│   ├── lib/
│   │   └── supabase.ts          # Supabase client (sessionStorage)
│   ├── services/
│   │   ├── authService.ts       # Login / logout / profile update
│   │   ├── ticketService.ts     # CRUD ใบค้างรับยา
│   │   ├── drugService.ts       # CRUD คลังยา
│   │   ├── userService.ts       # จัดการผู้ใช้ (admin only)
│   │   └── auditService.ts      # ดึง Audit Log
│   ├── pages/                   # 12 หน้า
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── CreateTicketPage.tsx
│   │   ├── TicketListPage.tsx
│   │   ├── TicketDetailPage.tsx
│   │   ├── OutstandingDrugsPage.tsx
│   │   ├── DrugManagementPage.tsx
│   │   ├── UserManagementPage.tsx
│   │   ├── LookupPage.tsx
│   │   ├── PublicStatusPage.tsx
│   │   ├── PrintPage.tsx
│   │   └── AuditLogPage.tsx
│   ├── components/
│   │   ├── StaffShell.tsx       # Layout หลัก + sidebar
│   │   ├── EditProfileModal.tsx
│   │   ├── StatusBadge.tsx
│   │   └── Icon.tsx
│   ├── types/                   # TypeScript interfaces
│   ├── utils/                   # name composition, QR helpers
│   └── App.tsx                  # Root component + routing
├── supabase/
│   └── migrations/              # 11 migration files
└── vercel.json                  # SPA rewrites
```

---

## ⚙️ เริ่มต้นใช้งาน

### 1. Clone & Install

```bash
git clone https://github.com/codex074/RxReady.git
cd RxReady
npm install
```

### 2. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` ที่ root:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_BASE_URL=https://your-domain.vercel.app
```

> **หมายเหตุ:** `VITE_APP_BASE_URL` ใช้สำหรับสร้าง URL ใน QR Code
> ถ้าไม่กำหนด จะใช้ `window.location.origin` โดยอัตโนมัติ

### 3. รัน Supabase Migrations

```bash
# ผ่าน Supabase Dashboard → SQL Editor
# หรือผ่าน Supabase CLI
supabase db push
```

Migrations จะถูกรันตามลำดับ ดูรายละเอียดใน [ส่วน Database](#-database--migrations)

### 4. Seed ข้อมูลผู้ใช้ (ถ้าต้องการ)

รัน `supabase/migrations/011_seed_users_from_json.sql` ใน SQL Editor  
จะสร้างผู้ใช้จาก `assets/user.json` ทั้งหมด 109 คน ด้วย role = `staff`

> **รหัสผ่านเริ่มต้น:** `RxReady#<phaID>` เช่น pha208 → `RxReady#pha208`

### 5. รัน Dev Server

```bash
npm run dev
# เปิด http://localhost:5173
```

---

## 🗄️ Database & Migrations

| # | ไฟล์ | สิ่งที่ทำ |
|---|------|---------|
| 001 | `init.sql` | ตาราง `profiles`, `backorder_tickets`, `backorder_items`, `audit_logs` + RLS policies + core functions |
| 002 | `username_auth.sql` | เพิ่ม `username` column, เปลี่ยนจาก email-based เป็น username login |
| 003 | `fix_token_no_pgcrypto.sql` | แก้ token generation ไม่ต้องพึ่ง pgcrypto |
| 004 | `rename_ticket_prefix.sql` | เปลี่ยน prefix ticket จาก `USC-` เป็น `BO-` |
| 005 | `drugs_table_and_seed.sql` | ตาราง `drugs` + seed ยากว่า 1,300 รายการ + GIN index สำหรับค้นหา |
| 006 | `self_update_profile.sql` | RPC `update_own_profile()` ให้เจ้าหน้าที่แก้ชื่อตัวเองได้ |
| 007 | `lookup_by_date.sql` | function ค้นใบค้างรับยาด้วยวันที่ + เบอร์โทร |
| 008 | `role_profile_revamp.sql` | แยก `display_name` → `prefix / f_name / l_name` + ปรับ roles ใหม่ |
| 009 | `audit_trail.sql` | Audit log ครบถ้วน + audited RPCs สำหรับทุก CRUD |
| 010 | `audit_log_retention.sql` | นโยบายการเก็บ audit log |
| 011 | `seed_users_from_json.sql` | Seed ผู้ใช้ 109 คนจาก `assets/user.json` |

---

## 🔐 ระบบสิทธิ์ (Roles)

```
┌─────────────────────────────────────────────────────────┐
│                        admin                            │
│  ✅ จัดการผู้ใช้  ✅ จัดการยา  ✅ ดู Audit Log        │
│  ✅ ออกใบ / อัปเดตสถานะ / ลบใบค้างรับยา               │
├─────────────────────────────────────────────────────────┤
│                      sub-admin                          │
│  ❌ จัดการผู้ใช้  ✅ จัดการยา  ❌ ดู Audit Log        │
│  ✅ ออกใบ / อัปเดตสถานะ                                │
├─────────────────────────────────────────────────────────┤
│                        staff                            │
│  ❌ จัดการผู้ใช้  ❌ จัดการยา  ❌ ดู Audit Log        │
│  ✅ ออกใบ / อัปเดตสถานะ                                │
└─────────────────────────────────────────────────────────┘
```

Row Level Security (RLS) บังคับใช้ระดับ Database — frontend ไม่สามารถ bypass ได้

---

## 🔑 Auth Flow

```
Login (username + PIN)
        │
        ▼
Supabase signInWithPassword
email: {username}@usc-rxready.vercel.app
pass:  RxReady#{PIN}
        │
        ▼
ดึง profiles table → ตรวจ is_active
        │
   ┌────┴─────┐
   │  active  │  inactive
   ▼          ▼
dashboard   sign out + error
```

**Session:** เก็บใน `sessionStorage` → ปิด browser = logout อัตโนมัติ

---

## 🌐 Routing (Client-side SPA)

| Route | Component | สิทธิ์ |
|-------|-----------|--------|
| `/` | LoginPage / Dashboard | Public / Staff |
| `/` (authed) | DashboardPage | Staff |
| `/status/:token` | PublicStatusPage | Public (ไม่ต้อง login) |

`vercel.json` redirect ทุก path กลับ `/index.html` เพื่อให้ React Router จัดการ

---

## 📜 Available Scripts

```bash
npm run dev        # Start dev server (port 5173)
npm run build      # Production build → /dist
npm run preview    # Preview production build
npm run typecheck  # TypeScript type check (no emit)
```

---

## 🚀 Deploy บน Vercel

1. Connect repo กับ Vercel
2. ตั้งค่า Environment Variables ใน Vercel Dashboard
3. Build command: `npm run build`
4. Output directory: `dist`
5. `vercel.json` จัดการ SPA rewrites ให้อัตโนมัติ

---

## 📸 หน้าจอหลัก

| หน้า | คำอธิบาย |
|------|---------|
| **Login** | Username + PIN พร้อมโลโก้กลุ่มงานเภสัชกรรม รพ.อุตรดิตถ์ |
| **Dashboard** | สรุปจำนวนใบตามสถานะ + รายการล่าสุด |
| **ออกใบค้างรับยา** | ฟอร์มข้อมูลผู้ป่วย + รายการยา พร้อม autocomplete จากคลังยา |
| **รายการใบค้าง** | ตารางค้นหา/กรอง + อัปเดตสถานะ inline |
| **สถานะผู้ป่วย** | หน้า public — ดูสถานะยาผ่าน QR หรือค้นด้วยเบอร์โทร |
| **พิมพ์** | ใบค้างรับยา + QR Code พร้อมพิมพ์ |

---

<div align="center">

กลุ่มงานเภสัชกรรม โรงพยาบาลอุตรดิตถ์ · กระทรวงสาธารณสุข

</div>
