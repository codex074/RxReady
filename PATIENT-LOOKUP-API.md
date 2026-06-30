# Patient Lookup by HN — Integration Spec

สเปกสำหรับดึง **ชื่อ-นามสกุลผู้ป่วย** (และข้อมูลพื้นฐาน) จากเลข **HN** ผ่าน API กลางของโรงพยาบาล
(API นี้เป็นตัวกลางที่ต่อกับ HOSxP อีกที — แอปฝั่ง client **ไม่ได้** query database ตรง)

> เอกสารนี้เขียนไว้ให้ AI/นักพัฒนานำไป implement ในแอปอื่นที่รันในวง LAN เดียวกันของโรงพยาบาล
> อ้างอิงจากโค้ดจริงของแอป HQ (`main.js`, `src/js/custom.js`)

---

## 1. ภาพรวม Flow

```
[กรอก/สแกน HN]
      │
      ▼
GET  {API_URL}/api/hosxp/patient   (Authorization: Bearer <TOKEN>,     body = {"HN": "<hn>"})
      │
      ├─ เจอข้อมูล (data.length > 0) ──► ใช้ data[0]
      │
      └─ ไม่เจอ (data.length == 0) ──► fallback:
            GET {API_URL}/api/hosxp/HIS  (Authorization: Bearer <TOKEN_HIS>, body = {"HN":"<hn>"})
                  │
                  └─ ใช้ data[0]  (ถ้ายังว่าง = ไม่พบผู้ป่วย)
```

**กฎสำคัญ:** ลอง endpoint หลัก (`/api/hosxp/patient`) ก่อนเสมอ ถ้าผลลัพธ์ `data` ว่าง ค่อย fallback ไป `/api/hosxp/HIS` (คนละ token กัน)

---

## 2. Configuration

ค่าเหล่านี้อยู่ในไฟล์ `config.ini` ของแอป (section `[API]`):

| ตัวแปร | ตัวอย่างค่า | ใช้ที่ |
|---|---|---|
| `API_URL` | `http://172.17.1.70:3000` | base URL ของทั้งสอง endpoint |
| `TOKEN` | JWT (Bearer) | สำหรับ `/api/hosxp/patient` |
| `TOKEN_HIS` | JWT (Bearer) | สำหรับ `/api/hosxp/HIS` (fallback) |

> ⚠️ **Token เป็น JWT ที่มีวันหมดอายุ (`exp`)** — ถ้าได้ HTTP 401 แปลว่า token หมดอายุ ต้องขอ token ใหม่จากผู้ดูแลระบบ API แล้วอัปเดตใน config
> อย่า hardcode token ลงในโค้ด ให้อ่านจาก config/env เสมอ

---

## 3. Endpoint รายละเอียด

### 3.1 `/api/hosxp/patient` (หลัก)

```
GET  {API_URL}/api/hosxp/patient
Headers:
  Authorization: Bearer {TOKEN}
  Content-Type: application/json
  Accept: */*
Body (JSON):
  { "HN": "<เลข HN>" }
```

### 3.2 `/api/hosxp/HIS` (fallback)

```
GET  {API_URL}/api/hosxp/HIS
Headers:
  Authorization: Bearer {TOKEN_HIS}      ← ใช้ token คนละตัว
  Content-Type: application/json
  Accept: */*
Body (JSON):
  { "HN": "<เลข HN>" }
```

### ⚠️ Gotcha ที่สำคัญที่สุด: **GET request พร้อม body**

API นี้รับเลข HN ผ่าน **request body** แต่ใช้ HTTP method เป็น **GET** (ไม่ใช่ POST)
ซึ่งผิดปกติและทำให้:

- ❌ `fetch()` / `XMLHttpRequest` ของ **browser ทำไม่ได้** — สเปกห้ามมี body ใน GET (body จะถูกตัดทิ้ง)
- ✅ `axios` (Node), Node `http` module, `curl`, Postman/Thunder Client → **ทำได้**

**ผลที่ตามมา:** ถ้าแอปใหม่เป็น **frontend ที่รันบน browser** จะเรียก API นี้ตรงๆ ไม่ได้ ต้องมี **backend/proxy** (Node/PHP/ฯลฯ) เป็นตัวกลางยิงให้ (ดูหัวข้อ 6)

---

## 4. รูปแบบ Response

ทั้งสอง endpoint คืน JSON หน้าตาเดียวกัน:

```json
{
  "data": [
    {
      "hn":     "0001234",
      "pname":  "นาย",
      "fname":  "สมชาย",
      "lname":  "ใจดี",
      "vn":     "680101120000",
      "oqueue": "000123"
    }
  ]
}
```

| field | ความหมาย |
|---|---|
| `data` | array — **ถ้าว่าง = ไม่พบผู้ป่วย** (เป็นตัวตัดสินว่าจะ fallback หรือไม่) |
| `hn` | เลข HN |
| `pname` | คำนำหน้าชื่อ (นาย/นาง/น.ส./เด็กชาย ...) |
| `fname` | ชื่อ |
| `lname` | นามสกุล |
| `vn` | Visit Number ของวันนี้ |
| `oqueue` | เลขคิวเดิม (ใช้เป็น QN ในแอป HQ) |

**การประกอบชื่อเต็ม** (ตามที่แอปทำจริง):
```js
const fullName = pname + fname + " " + lname;   // เช่น "นายสมชาย ใจดี"
```
> สังเกต: `pname` + `fname` ติดกัน (ไม่มีเว้นวรรค) แล้วเว้นวรรคก่อน `lname`

---

## 5. Pseudocode (ภาษากลาง)

```
function lookupPatientByHN(hn):
    if hn is empty: return null

    resp = httpGetWithBody(API_URL + "/api/hosxp/patient",
                           token=TOKEN, body={ "HN": hn })

    if resp.data is empty:
        resp = httpGetWithBody(API_URL + "/api/hosxp/HIS",
                               token=TOKEN_HIS, body={ "HN": hn })

    if resp.data is empty: return null   // ไม่พบผู้ป่วย

    p = resp.data[0]
    return {
        hn:       p.hn,
        fullName: p.pname + p.fname + " " + p.lname,
        vn:       p.vn,
        oqueue:   p.oqueue
    }
```

---

## 6. ตัวอย่างการ implement

### 6.1 Node.js — zero dependency (รองรับ GET + body)

```js
const http = require("http");

function httpGetWithBody(url, token, hn) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify({ HN: hn });
    const req = http.request({
      hostname: u.hostname,
      port: u.port || 80,
      path: u.pathname,
      method: "GET",                          // ← GET แต่มี body
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      let buf = "";
      res.on("data", (c) => (buf += c));
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300)
          return reject(Object.assign(new Error("HTTP " + res.statusCode), { status: res.statusCode }));
        try { resolve(JSON.parse(buf)); } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(body);                          // ← เขียน body ลงไปแม้เป็น GET
    req.end();
  });
}

async function lookupHN(hn, cfg) {
  let r = await httpGetWithBody(cfg.API_URL + "/api/hosxp/patient", cfg.TOKEN, hn);
  if (!r.data || r.data.length === 0)
    r = await httpGetWithBody(cfg.API_URL + "/api/hosxp/HIS", cfg.TOKEN_HIS, hn);
  if (!r.data || r.data.length === 0) return null;
  const p = r.data[0];
  return { hn: p.hn, fullName: p.pname + p.fname + " " + p.lname, vn: p.vn, oqueue: p.oqueue };
}
```

### 6.2 Node.js — axios (ถ้าโปรเจกต์มี axios อยู่แล้ว)

```js
const axios = require("axios");

async function request(url, token, hn) {
  const res = await axios.request({
    url, method: "GET",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    data: JSON.stringify({ HN: hn }),   // axios ส่ง body พร้อม GET ได้
  });
  return res.data;
}
```

### 6.3 Browser frontend → ต้องผ่าน backend proxy

Browser เรียก API โรงพยาบาลตรงๆ ไม่ได้ (ทั้งเรื่อง GET+body และ CORS) ให้ทำ endpoint กลางในฝั่ง server ของแอปเอง:

```
[Browser]  fetch("/api/lookup?hn=123")        ← เรียก backend ของตัวเอง (same-origin, ปลอดภัย)
     │
     ▼
[Backend]  lookupHN("123")  ──►  ยิงไป API โรงพยาบาล (GET+body) แล้วคืน JSON สะอาดๆ กลับ
     │
     ▼
[Browser]  แสดงชื่อ-นามสกุล
```

ฝั่ง browser:
```js
const res = await fetch("/api/lookup?hn=" + encodeURIComponent(hn));
const { fullName, hn, vn } = await res.json();
```

> ข้อดีของ proxy: ไม่เปิดเผย token ให้ฝั่ง client, เลี่ยง CORS, และซ่อน gotcha GET+body ไว้ในเซิร์ฟเวอร์

---

## 7. การจัดการ Error

| สถานการณ์ | การตรวจจับ | ควรทำ |
|---|---|---|
| ไม่พบผู้ป่วย | ทั้งสอง endpoint คืน `data` ว่าง | แจ้ง "ไม่พบข้อมูลผู้ป่วย" |
| Token หมดอายุ | HTTP **401** | แจ้งให้ขอ/อัปเดต token ใหม่ใน config |
| ต่อ API ไม่ได้ | `ETIMEDOUT` / `ECONNREFUSED` | เช็คว่าเครื่องอยู่ในวง LAN และเข้าถึง `172.17.1.70` ได้ |
| Response ไม่ใช่ JSON | `JSON.parse` พัง | log raw response ไว้ debug |

---

## 8. Checklist สำหรับ implement ในแอปใหม่

- [ ] อ่าน `API_URL`, `TOKEN`, `TOKEN_HIS` จาก config/env (ห้าม hardcode)
- [ ] ยิง GET พร้อม body (ใช้ tool ที่รองรับ — Node http/axios, **ไม่ใช่** browser fetch)
- [ ] ลอง `/api/hosxp/patient` ก่อน → fallback `/api/hosxp/HIS` เมื่อ `data` ว่าง
- [ ] ประกอบชื่อ: `pname + fname + " " + lname`
- [ ] ถ้าเป็น web app → วาง logic นี้ไว้ฝั่ง backend/proxy เท่านั้น
- [ ] จัดการ 401 (token หมดอายุ) และ network error ให้ผู้ใช้เข้าใจ
- [ ] ต้องรันในวง LAN ของโรงพยาบาล (เข้าถึง `172.17.1.70:3000` ได้)

---

## 9. ทดสอบเร็วด้วย curl

```bash
curl -X GET "http://172.17.1.70:3000/api/hosxp/patient" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"HN":"<เลข HN>"}'
```

(curl ส่ง body พร้อม GET ได้ จึงใช้ทดสอบ endpoint ได้ตรงๆ)
