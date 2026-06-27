# UI_REQUIREMENTS.md

เอกสารนี้เป็นแนวทาง UI/UX สำหรับโปรเจค **ระบบออกใบค้างยา + QR ตรวจสอบสถานะยา**  
ให้ AI Agent เช่น Claude Code, Codex หรือผู้พัฒนานำไปใช้ร่วมกับ `AGENTS.md`

---

## 1. เป้าหมายของ UI

ระบบนี้ควรมีหน้าตาแบบ **Healthcare Minimal Web App** ใช้งานง่ายสำหรับเจ้าหน้าที่ห้องยา และอ่านสถานะได้ชัดเจนสำหรับผู้ป่วย

แนวทางหลัก:

- โทนสีฟ้า minimal สะอาด สบายตา
- อ่านง่าย ใช้งานง่าย ไม่ซับซ้อน
- ปุ่ม action สำคัญต้องเด่นและแยกสีชัดเจน
- ใช้ card layout, rounded corner, soft shadow
- รองรับ desktop, tablet และ mobile
- ใช้ SweetAlert2 แทน `window.alert`, `window.confirm`, `window.prompt`
- เหมาะกับการใช้งานในโรงพยาบาล ห้องยา หรือเคาน์เตอร์บริการ

---

## 2. Design Theme

### 2.1 Mood & Tone

ใช้โทน:

```text
Minimal
Clean
Soft Blue
Healthcare
Friendly
Professional
```

หลีกเลี่ยง:

```text
สีจัดเกินไป
พื้นหลังมืด
ปุ่มเยอะเกินไป
ข้อความแน่นเกินไป
ตารางที่อ่านยากบนมือถือ
```

---

## 3. Color Palette ที่แนะนำ

ใช้ Tailwind CSS เป็นหลัก

### Primary Blue

```text
blue-600     ปุ่มหลัก / active menu
blue-500     hover / icon highlight
blue-100     background badge / soft panel
blue-50      page background
```

### Neutral

```text
slate-900    heading
slate-700    body text
slate-500    secondary text
slate-300    border
white        card background
```

### Status Colors

| Status | สีที่แนะนำ | ความหมาย |
|---|---|---|
| pending | amber | รอจัดหา / รอยาเข้า |
| preparing | sky / blue | กำลังเตรียมยา |
| ready | emerald / green | พร้อมรับยา |
| picked_up | slate / gray | รับยาแล้ว |
| cancelled | rose / red | ยกเลิก |

---

## 4. Typography

### Font

แนะนำใช้ font ที่อ่านภาษาไทยง่าย เช่น

```text
Noto Sans Thai
Sarabun
Prompt
Inter + Noto Sans Thai fallback
```

### ขนาดตัวอักษร

| ส่วน | ขนาดโดยประมาณ |
|---|---|
| Page title | text-2xl ถึง text-3xl |
| Section title | text-xl |
| Card title | text-lg |
| Body | text-sm หรือ text-base |
| Helper text | text-xs ถึง text-sm |

---

## 5. Layout หลัก

### 5.1 Staff Layout

หน้าฝั่งเจ้าหน้าที่ควรมี layout ดังนี้:

```text
[Top Navbar]
  - ชื่อระบบ
  - ชื่อผู้ใช้
  - ปุ่ม logout

[Sidebar หรือ Mobile Bottom/Nav]
  - Dashboard
  - สร้างใบค้างยา
  - รายการใบค้างยา
  - ค้นหาใบค้างยา
  - ตั้งค่า / ผู้ใช้ ถ้ามี

[Main Content]
  - Header ของหน้านั้น
  - Action button ด้านขวาบน
  - Content แบบ card/table/form
```

บนจอเล็ก sidebar ควรยุบเป็น hamburger menu หรือ bottom navigation

---

## 6. หน้าที่ควรมี

## 6.1 Login Page

Path แนะนำ:

```text
/login
```

องค์ประกอบ:

- Logo หรือ icon โรงพยาบาล / ห้องยา
- ชื่อระบบ: ระบบใบค้างยาออนไลน์
- กล่อง login สีขาวกลางหน้า
- input: email / password
- ปุ่มเข้าสู่ระบบสีฟ้า
- ข้อความ error ด้วย SweetAlert2 หรือ inline error

UX:

- ถ้า login ไม่สำเร็จ ให้ขึ้น SweetAlert2 แบบ error
- ถ้า login สำเร็จ ให้ redirect ไป Dashboard

---

## 6.2 Staff Dashboard

Path แนะนำ:

```text
/dashboard
```

องค์ประกอบ:

### Summary Cards

ควรมี card สรุปจำนวน:

- ใบค้างทั้งหมดวันนี้
- รอจัดหา / pending
- กำลังเตรียม / preparing
- พร้อมรับยา / ready
- รับยาแล้ว / picked up

ตัวอย่าง layout:

```text
[ทั้งหมดวันนี้] [รอจัดหา] [กำลังเตรียม] [พร้อมรับยา] [รับยาแล้ว]
```

### Recent Tickets

แสดงรายการใบค้างล่าสุด เช่น 10 รายการล่าสุด

ข้อมูลในตาราง:

| เลขใบค้าง | ชื่อผู้ป่วย | จำนวนรายการยา | สถานะ | อัปเดตล่าสุด | Action |
|---|---|---|---|---|---|

Action:

- ดูรายละเอียด
- พิมพ์ QR
- เปลี่ยนสถานะ

---

## 6.3 Create Ticket Page

Path แนะนำ:

```text
/tickets/new
```

องค์ประกอบ:

### Patient Information Card

Fields:

- HN
- ชื่อผู้ป่วย
- เบอร์โทร
- หมายเหตุ

### Drug Items Card

Fields ต่อรายการยา:

- ชื่อยา
- จำนวนที่ค้าง
- หน่วย
- หมายเหตุรายการยา

ควรมีปุ่ม:

- เพิ่มรายการยา
- ลบรายการยา

### Action Buttons

- บันทึกใบค้างยา
- ยกเลิก

SweetAlert2:

- กดบันทึก → confirm ก่อนบันทึก
- บันทึกสำเร็จ → success พร้อมปุ่มไปหน้าพิมพ์ QR
- validation error → warning หรือ error

---

## 6.4 Ticket List Page

Path แนะนำ:

```text
/tickets
```

องค์ประกอบ:

### Filter Bar

- ค้นหาด้วยเลขใบค้าง
- ค้นหาด้วย HN
- ค้นหาด้วยชื่อผู้ป่วย
- filter สถานะ
- filter วันที่

### Ticket Table

Columns:

| เลขใบค้าง | HN | ชื่อผู้ป่วย | รายการยา | สถานะ | วันที่สร้าง | Action |
|---|---|---|---|---|---|---|

บน mobile ควรเปลี่ยน table เป็น card list

---

## 6.5 Ticket Detail Page

Path แนะนำ:

```text
/tickets/:id
```

องค์ประกอบ:

### Header

- เลขใบค้างยา
- Status badge
- วันที่สร้าง
- ปุ่มพิมพ์ QR

### Patient Card

- HN
- ชื่อผู้ป่วย
- เบอร์โทรแบบ masked หรือเต็มเฉพาะ staff

### Drug Items Card

รายการยาแบบ table/card

| ชื่อยา | จำนวนค้าง | หน่วย | สถานะรายการ | หมายเหตุ |
|---|---|---|---|---|

### Status Action Card

ปุ่มเปลี่ยนสถานะ:

- รอจัดหา
- กำลังเตรียมยา
- พร้อมรับยา
- รับยาแล้ว
- ยกเลิกใบค้าง

SweetAlert2:

- เปลี่ยนเป็นพร้อมรับยา → confirm
- เปลี่ยนเป็นรับยาแล้ว → confirm
- ยกเลิกใบค้าง → confirm แบบ warning สีแดง

---

## 6.6 Print QR Page

Path แนะนำ:

```text
/tickets/:id/print
```

หน้าสำหรับพิมพ์ใบค้างยาและ QR Code

องค์ประกอบ:

- ชื่อโรงพยาบาล / ห้องยา
- ชื่อระบบหรือหัวข้อ “ใบค้างยา”
- เลขที่ใบค้างยา
- วันที่ออกใบค้าง
- ชื่อผู้ป่วย
- รายการยาที่ค้าง
- QR Code ขนาดใหญ่พอสมควร
- ข้อความกำกับ: “สแกนเพื่อตรวจสอบสถานะยา”
- URL แบบสั้นใต้ QR เผื่อสแกนไม่ได้

ปุ่มบนหน้า:

- พิมพ์
- กลับไปหน้ารายละเอียด

Print CSS:

- ซ่อน navbar/sidebar/action button ตอนพิมพ์
- ใช้พื้นหลังขาว
- ขนาดเหมาะกับ A5 หรือ slip ขนาดเล็ก

SweetAlert2:

- ก่อนพิมพ์อาจไม่จำเป็นต้อง confirm
- ถ้าต้องการ confirm ให้ใช้ข้อความ “ต้องการพิมพ์ใบค้างยานี้หรือไม่?”

---

## 6.7 Public Status Page

Path แนะนำ:

```text
/status/:publicToken
```

หน้านี้สำหรับผู้ป่วยเปิดจาก QR Code

Design:

- ไม่ต้องมี login
- ใช้ layout เรียบง่าย เหมาะกับมือถือ
- กล่อง status ใหญ่ตรงกลาง
- ใช้สีตามสถานะ
- แสดงข้อมูลเท่าที่จำเป็น

ข้อมูลที่แสดง:

- เลขที่ใบค้างยา
- สถานะยา
- อัปเดตล่าสุด
- คำแนะนำการมารับยา
- ปุ่ม refresh / ตรวจสอบอีกครั้ง

ไม่ควรแสดง:

- HN เต็ม
- เบอร์โทรเต็ม
- ข้อมูลส่วนตัวละเอียด
- ข้อมูลเจ้าหน้าที่

ตัวอย่างข้อความตามสถานะ:

### pending

```text
ขณะนี้รายการยาของท่านอยู่ระหว่างรอจัดหา
กรุณาตรวจสอบสถานะอีกครั้งภายหลัง
```

### preparing

```text
ห้องยากำลังเตรียมยาของท่าน
กรุณาตรวจสอบสถานะอีกครั้งภายหลัง
```

### ready

```text
ยาของท่านพร้อมรับแล้ว
กรุณาติดต่อรับยาที่ห้องยาในเวลาทำการ
```

### picked_up

```text
รายการนี้ถูกรับยาเรียบร้อยแล้ว
```

### cancelled

```text
รายการใบค้างยานี้ถูกยกเลิก
กรุณาติดต่อห้องยา หากมีข้อสงสัย
```

---

## 6.8 Lookup Page

Path แนะนำ:

```text
/lookup
```

สำหรับผู้ป่วยที่ไม่ได้สแกน QR แต่กรอกเลขใบค้างยาเอง

Fields:

- เลขที่ใบค้างยา
- เบอร์โทร 4 หลักท้าย

ปุ่ม:

- ตรวจสอบสถานะ

SweetAlert2:

- ไม่พบข้อมูล → warning
- กรอกข้อมูลไม่ครบ → warning
- ระบบผิดพลาด → error

เมื่อค้นหาสำเร็จ ให้ redirect ไป public status page หรือแสดง status card ในหน้าเดียวกัน

---

## 7. Components ที่ควรสร้าง

แนะนำแยก component ดังนี้:

```text
components/
  AppLayout.tsx
  StaffNavbar.tsx
  StaffSidebar.tsx
  PageHeader.tsx
  StatCard.tsx
  StatusBadge.tsx
  TicketTable.tsx
  TicketCard.tsx
  TicketForm.tsx
  DrugItemForm.tsx
  QRCodeCard.tsx
  PrintTicket.tsx
  PublicStatusCard.tsx
  EmptyState.tsx
  LoadingSpinner.tsx
  ErrorState.tsx
  ConfirmDialog.ts
```

---

## 8. SweetAlert2 Requirements

ต้องใช้ SweetAlert2 สำหรับ action สำคัญทุกครั้ง

### ห้ามใช้

```text
window.alert
window.confirm
window.prompt
```

### Action ที่ต้องมี confirm

| Action | SweetAlert Type |
|---|---|
| บันทึกใบค้างยา | question / confirm |
| ลบรายการยา | warning |
| เปลี่ยนสถานะเป็นพร้อมรับยา | question |
| เปลี่ยนสถานะเป็นรับยาแล้ว | question |
| ยกเลิกใบค้างยา | warning / danger |
| logout | question |

### Action ที่ต้องมี success popup

| Action | SweetAlert Type |
|---|---|
| สร้างใบค้างสำเร็จ | success |
| อัปเดตสถานะสำเร็จ | success |
| พิมพ์/สร้าง QR สำเร็จ | success หรือ toast |

### Action ที่ต้องมี error popup

| Action | SweetAlert Type |
|---|---|
| บันทึกไม่สำเร็จ | error |
| ไม่พบข้อมูล | warning |
| permission denied | error |
| network error | error |

---

## 9. Loading / Empty / Error State

ทุกหน้าควรรองรับ state เหล่านี้

### Loading

- ใช้ spinner สีฟ้า
- มีข้อความ เช่น “กำลังโหลดข้อมูล...”

### Empty

ตัวอย่าง:

```text
ยังไม่มีใบค้างยาในวันนี้
เริ่มสร้างใบค้างยาใหม่ได้จากปุ่มด้านบน
```

### Error

ตัวอย่าง:

```text
ไม่สามารถโหลดข้อมูลได้
กรุณาลองใหม่อีกครั้ง
```

มีปุ่ม:

- ลองใหม่
- กลับหน้าหลัก

---

## 10. Responsive Design

### Desktop

- ใช้ sidebar + main content
- ตารางแสดงเต็ม
- dashboard cards แสดง 4-5 columns

### Tablet

- sidebar ยุบได้
- dashboard cards 2 columns
- table ยังใช้ได้แต่ควร scroll แนวนอน

### Mobile

- ใช้ card list แทน table
- ปุ่ม action ควรเต็มความกว้าง
- public status page ต้องอ่านง่ายมาก
- QR/lookup page ต้องเหมาะกับผู้ป่วยสูงอายุ

---

## 11. Accessibility

ควรมี:

- contrast สีตัวอักษรอ่านง่าย
- ปุ่มใหญ่พอสำหรับ touch screen
- label ทุก input
- error message ชัดเจน
- ไม่ใช้สีอย่างเดียวในการสื่อสถานะ ต้องมีข้อความด้วย
- public status page ใช้ตัวอักษรใหญ่กว่าปกติเล็กน้อย

---

## 12. Microcopy ภาษาไทยที่แนะนำ

### ปุ่ม

```text
สร้างใบค้างยา
บันทึกใบค้างยา
เพิ่มรายการยา
ลบรายการ
พิมพ์ QR
ตรวจสอบสถานะ
พร้อมรับยา
รับยาแล้ว
ยกเลิกใบค้าง
กลับหน้าหลัก
```

### SweetAlert Confirm

```text
ยืนยันการบันทึกใบค้างยา?
ต้องการเปลี่ยนสถานะเป็น “พร้อมรับยา” ใช่หรือไม่?
ต้องการบันทึกว่าผู้ป่วยรับยาแล้วใช่หรือไม่?
ต้องการยกเลิกใบค้างยานี้ใช่หรือไม่?
```

### Success

```text
บันทึกใบค้างยาสำเร็จ
อัปเดตสถานะสำเร็จ
สร้าง QR Code สำเร็จ
```

### Error

```text
ไม่สามารถบันทึกข้อมูลได้
ไม่พบข้อมูลใบค้างยา
กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง
```

---

## 13. Suggested UI Pages Summary

| Page | Path | Auth Required | Main User |
|---|---|---|---|
| Login | `/login` | No | Staff |
| Dashboard | `/dashboard` | Yes | Staff |
| Create Ticket | `/tickets/new` | Yes | Staff |
| Ticket List | `/tickets` | Yes | Staff |
| Ticket Detail | `/tickets/:id` | Yes | Staff |
| Print QR | `/tickets/:id/print` | Yes | Staff |
| Public Status | `/status/:publicToken` | No | Patient |
| Lookup | `/lookup` | No | Patient |

---

## 14. Implementation Notes for AI Agent

เมื่อนำเอกสารนี้ไปใช้ ให้ AI Agent ทำตามนี้:

1. ใช้ UI requirement นี้ร่วมกับ `AGENTS.md`
2. สร้าง component reusable ก่อน
3. ใช้ Tailwind utility class เป็นหลัก
4. ติดตั้ง SweetAlert2 และสร้าง helper wrapper สำหรับ confirm/success/error
5. ห้ามเขียน logic SMS หรือ notification ใน phase นี้
6. เน้น QR status workflow ให้เสร็จก่อน
7. ทุกหน้า public ต้องไม่เปิดเผยข้อมูลผู้ป่วยเกินจำเป็น

---

## 15. Prompt สำหรับสั่ง AI Agent

```text
อ่าน AGENTS.md และ UI_REQUIREMENTS.md ทั้งหมดก่อนเริ่มงาน

ให้สร้าง UI ของระบบใบค้างยาโทนสีฟ้า minimal ตาม UI_REQUIREMENTS.md
ใช้ React + TypeScript + Tailwind CSS + SweetAlert2

เริ่มจากสร้าง layout, reusable components, routes และหน้า UI mock ที่เชื่อมกับ type definitions ก่อน

ห้าม implement ระบบ SMS, SMSMKT, LINE หรือ notification ใด ๆ ใน phase นี้

หลังทำเสร็จให้สรุปไฟล์ที่สร้าง/แก้ไข วิธี run project และวิธีทดสอบแต่ละหน้า
```
