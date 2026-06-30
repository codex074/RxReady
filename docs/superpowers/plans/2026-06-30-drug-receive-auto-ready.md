# Drug Receive → Auto-Ready Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่มฟีเจอร์รับยาเข้าสต็อกในหน้า "ยาค้างคนไข้" ที่จัดการ FIFO auto-ready อัตโนมัติตามลำดับการออกใบค้าง

**Architecture:** เพิ่ม column `received_qty` ใน `backorder_items` และ RPC `receive_drug_stock` ที่ทำ FIFO allocation และเปลี่ยนสถานะ ticket เป็น ready ใน transaction เดียว (atomic) — UI เป็น modal ใน `OutstandingDrugsPage` พร้อม client-side preview คำนวณจาก tickets ที่โหลดอยู่แล้ว

**Tech Stack:** PostgreSQL (Supabase RPC), React + TypeScript, Tailwind CSS (inline), Sweetalert2

## Global Constraints

- ไม่มี test framework — ใช้ `npx tsc --noEmit` สำหรับ type check และ manual browser verification
- ทุก SQL ต้องใช้ `IF NOT EXISTS` / `CREATE OR REPLACE` เพื่อ idempotent
- ชื่อ function/variable ต้องตรงกับ spec: `receiveDrugStock`, `received_qty`, `DrugReceiveModal`, `receive_drug_stock`
- Style: inline Tailwind เหมือนไฟล์อื่นในโปรเจกต์ — ไม่มี CSS class แยก ไม่มี component library
- Toast ใช้ `showToast()` จาก App.tsx เท่านั้น, error dialog ใช้ `showError()` (Swal)
- ห้าม nest `<button>` ภายใน `<button>` — invalid HTML
- อย่าแตะไฟล์อื่นนอกจากที่ระบุในแต่ละ Task

---

### Task 1: Database migration — `received_qty` column + `receive_drug_stock` RPC

**Files:**
- Create: `supabase/migrations/012_receive_drug_stock.sql`

**Interfaces:**
- Produces: column `received_qty numeric NOT NULL DEFAULT 0` ใน `backorder_items`
- Produces: RPC `public.receive_drug_stock(payload jsonb)` returns `jsonb`

- [ ] **Step 1: สร้างไฟล์ migration**

สร้างไฟล์ `supabase/migrations/012_receive_drug_stock.sql` ด้วยเนื้อหาด้านล่างทั้งหมด:

```sql
-- 012_receive_drug_stock.sql
-- เพิ่ม received_qty เพื่อ track partial fulfillment ต่อ item

ALTER TABLE public.backorder_items
  ADD COLUMN IF NOT EXISTS received_qty numeric NOT NULL DEFAULT 0
  CONSTRAINT backorder_items_received_qty_nonneg CHECK (received_qty >= 0);

CREATE OR REPLACE FUNCTION public.receive_drug_stock(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor         uuid;
  p_drug_name   text    := btrim(coalesce(payload->>'drugName', ''));
  p_unit        text    := btrim(coalesce(payload->>'unit', ''));
  p_qty         numeric;
  r             record;
  remaining     numeric;
  give          numeric;
  qty_allocated numeric := 0;
  touched_ids   uuid[]  := '{}';
  ready_ids     uuid[]  := '{}';
  partial_ids   uuid[]  := '{}';
  tid           uuid;
  all_fulfilled boolean;
BEGIN
  actor := public.assert_active_staff();

  IF p_drug_name = '' THEN
    RAISE EXCEPTION 'drugName is required' USING ERRCODE = '22023';
  END IF;

  BEGIN
    p_qty := (payload->>'qtyReceived')::numeric;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'qtyReceived must be a number' USING ERRCODE = '22023';
  END;

  IF p_qty <= 0 THEN
    RAISE EXCEPTION 'qtyReceived must be greater than 0' USING ERRCODE = '22023';
  END IF;

  remaining := p_qty;

  -- FIFO: lock items ordered by ticket creation date
  FOR r IN
    SELECT bi.id AS item_id, bi.ticket_id, bi.qty, bi.received_qty
    FROM public.backorder_items bi
    JOIN public.backorder_tickets bt ON bt.id = bi.ticket_id
    WHERE lower(btrim(bi.drug_name)) = lower(p_drug_name)
      AND btrim(bi.unit)             = p_unit
      AND bt.status                  = 'preparing'
      AND bi.qty - bi.received_qty   > 0
    ORDER BY bt.created_at ASC, bt.id ASC
    FOR UPDATE OF bi
  LOOP
    EXIT WHEN remaining <= 0;

    give          := LEAST(r.qty - r.received_qty, remaining);
    remaining     := remaining - give;
    qty_allocated := qty_allocated + give;

    UPDATE public.backorder_items
       SET received_qty = received_qty + give
     WHERE id = r.item_id;

    IF NOT (r.ticket_id = ANY(touched_ids)) THEN
      touched_ids := array_append(touched_ids, r.ticket_id);
    END IF;
  END LOOP;

  -- ตรวจแต่ละ ticket ที่ถูก touch: ถ้าทุก item ครบ → ready
  FOREACH tid IN ARRAY touched_ids LOOP
    SELECT bool_and(received_qty >= qty)
      INTO all_fulfilled
      FROM public.backorder_items
     WHERE ticket_id = tid;

    IF all_fulfilled THEN
      UPDATE public.backorder_tickets
         SET status     = 'ready',
             ready_at   = now(),
             ready_by   = actor,
             updated_by = actor
       WHERE id = tid;

      INSERT INTO public.audit_logs
        (ticket_id, ticket_no, action, old_status, new_status, actor_id, actor_type, detail)
      SELECT id, ticket_no,
             'update_status', 'preparing', 'ready',
             actor, 'staff',
             jsonb_build_object('source', 'drug_receipt',
                                'drugName', p_drug_name,
                                'unit', p_unit)
        FROM public.backorder_tickets WHERE id = tid;

      ready_ids := array_append(ready_ids, tid);
    ELSE
      partial_ids := array_append(partial_ids, tid);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'readyTicketIds',   to_jsonb(ready_ids),
    'partialTicketIds', to_jsonb(partial_ids),
    'qtyAllocated',     qty_allocated
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.receive_drug_stock(jsonb) TO authenticated;
```

- [ ] **Step 2: Apply migration ใน Supabase**

ใน Supabase dashboard → SQL Editor → วาง SQL ทั้งหมดจาก Step 1 → กด Run

Expected: ไม่มี error สีแดง

- [ ] **Step 3: ตรวจสอบ**

ใน Supabase → Table Editor → `backorder_items` → ตรวจว่ามี column `received_qty` type `numeric`, default `0`

ใน Supabase → Database → Functions → ตรวจว่ามี `receive_drug_stock`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/012_receive_drug_stock.sql
git commit -m "feat(db): add received_qty column and receive_drug_stock RPC"
```

---

### Task 2: TypeScript types + service function

**Files:**
- Modify: `src/types/database.ts`
- Modify: `src/types/backorder.ts`
- Modify: `src/services/ticketService.ts`
- Modify: `src/data/mockTickets.ts`

**Interfaces:**
- Consumes: column `received_qty` จาก Task 1
- Produces:
  - `BackorderItemRow.received_qty: number`
  - `TicketItem.receivedQty: number`
  - `type DrugReceiptResult = { readyTicketIds: string[]; partialTicketIds: string[]; qtyAllocated: number }`
  - `receiveDrugStock(drugName: string, unit: string, qtyReceived: number): Promise<DrugReceiptResult>`

- [ ] **Step 1: เพิ่ม `received_qty` ใน `BackorderItemRow`**

เปิด `src/types/database.ts` แก้ type `BackorderItemRow` — เพิ่ม `received_qty` บรรทัดสุดท้ายก่อนปิด `}`:

```typescript
export type BackorderItemRow = {
  id: string;
  ticket_id: string;
  drug_name: string;
  qty: number;
  unit: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  received_qty: number;
};
```

- [ ] **Step 2: เพิ่ม `receivedQty` ใน `TicketItem`**

เปิด `src/types/backorder.ts` แก้ type `TicketItem`:

```typescript
export type TicketItem = {
  id: string;
  name: string;
  qty: number | string;
  unit: string;
  note: string;
  status: TicketStatus;
  receivedQty: number;
};
```

- [ ] **Step 3: Map `received_qty` ใน `mapTicket`**

เปิด `src/services/ticketService.ts` แก้ `items` ใน `mapTicket`:

```typescript
items: (row.backorder_items || []).map((item) => ({
  id: item.id,
  name: item.drug_name,
  qty: Number(item.qty),
  unit: item.unit,
  note: item.note || '',
  status: normalizeStatus(row.status),
  receivedQty: Number(item.received_qty ?? 0),
})),
```

- [ ] **Step 4: เพิ่ม `DrugReceiptResult` type และ `receiveDrugStock` function**

ในไฟล์เดียวกัน `src/services/ticketService.ts` เพิ่มด้านล่าง `export async function updateStatus`:

```typescript
export type DrugReceiptResult = {
  readyTicketIds: string[];
  partialTicketIds: string[];
  qtyAllocated: number;
};

export async function receiveDrugStock(
  drugName: string,
  unit: string,
  qtyReceived: number,
): Promise<DrugReceiptResult> {
  const result = await requireSupabase().rpc('receive_drug_stock', {
    payload: { drugName, unit, qtyReceived },
  });
  if (result.error) throw result.error;
  return result.data as DrugReceiptResult;
}
```

- [ ] **Step 5: แก้ mock data factory ใน `src/data/mockTickets.ts`**

เปิด `src/data/mockTickets.ts` แก้ `items.map(...)` ภายใน function `ticket()` — เพิ่ม `receivedQty: 0`:

```typescript
items: items.map(([itemName, qty, unit], index) => ({
  id: `${no}-${index}`,
  name: itemName,
  qty,
  unit,
  note: '',
  status,
  receivedQty: 0,
})),
```

- [ ] **Step 6: Type check**

```bash
npx tsc --noEmit
```

Expected: ไม่มี error เกี่ยวกับ `receivedQty`, `received_qty`, หรือ `DrugReceiptResult`

ถ้ามี error อื่นที่เกี่ยวกับ `TicketItem` → หาไฟล์ที่ inline-construct TicketItem แล้วเพิ่ม `receivedQty: 0`

- [ ] **Step 7: Commit**

```bash
git add src/types/database.ts src/types/backorder.ts src/services/ticketService.ts src/data/mockTickets.ts
git commit -m "feat: add receivedQty to TicketItem and receiveDrugStock service"
```

---

### Task 3: DrugReceiveModal component

**Files:**
- Create: `src/components/DrugReceiveModal.tsx`

**Interfaces:**
- Consumes: `Ticket[]` และ `TicketItem.receivedQty: number` จาก Task 2
- Produces:
  ```typescript
  // export จาก DrugReceiveModal.tsx
  export function DrugReceiveModal(props: DrugReceiveModalProps): JSX.Element

  type DrugReceiveModalProps = {
    drugName: string;   // ชื่อยา (ตรงกับ drug.name ใน OutstandingDrugsPage)
    unit: string;       // หน่วย เช่น "เม็ด"
    tickets: Ticket[];  // tickets ทั้งหมด (กรองเฉพาะ 'preparing' ใน component)
    onConfirm: (qty: number) => Promise<void>;  // throw = modal แสดง error, resolve = modal ปิด
    onClose: () => void;
  }
  ```

- [ ] **Step 1: สร้าง `src/components/DrugReceiveModal.tsx`**

```typescript
import { useState, useMemo } from 'react';
import type { Ticket, TicketItem } from '../types/backorder';

type PreviewLine = {
  ticketId: string;
  ticketNo: string;
  patientName: string;
  willReceive: number;
  becomesReady: boolean;
  pendingOtherItems: Array<{ name: string; qty: number; unit: string }>;
};

type ReceiptPreview = {
  readyLines: PreviewLine[];
  partialLines: PreviewLine[];
  allCovered: boolean;
  hasAnyCandidates: boolean;
};

type Candidate = { ticket: Ticket; item: TicketItem; need: number };

function computePreview(
  tickets: Ticket[],
  drugName: string,
  unit: string,
  qtyReceived: number,
): ReceiptPreview {
  const normalizedDrug = drugName.trim().toLowerCase();
  const candidates: Candidate[] = [];

  for (const ticket of tickets) {
    if (ticket.status !== 'preparing') continue;
    for (const item of ticket.items) {
      if (item.name.trim().toLowerCase() !== normalizedDrug) continue;
      if (item.unit !== unit) continue;
      const need = Number(item.qty) - (item.receivedQty ?? 0);
      if (need <= 0) continue;
      candidates.push({ ticket, item, need });
    }
  }

  candidates.sort((a, b) => a.ticket.createdAt - b.ticket.createdAt);

  let remaining = qtyReceived;
  const allocated = new Map<string, number>();

  for (const { ticket, need } of candidates) {
    if (remaining <= 0) break;
    const give = Math.min(need, remaining);
    remaining -= give;
    allocated.set(ticket.id, (allocated.get(ticket.id) ?? 0) + give);
  }

  const readyLines: PreviewLine[] = [];
  const partialLines: PreviewLine[] = [];

  for (const [ticketId, willReceive] of allocated.entries()) {
    const ticket = tickets.find((t) => t.id === ticketId)!;

    const becomesReady = ticket.items.every((ti) => {
      const isThisDrug =
        ti.name.trim().toLowerCase() === normalizedDrug && ti.unit === unit;
      return isThisDrug
        ? (ti.receivedQty ?? 0) + willReceive >= Number(ti.qty)
        : (ti.receivedQty ?? 0) >= Number(ti.qty);
    });

    const pendingOtherItems = ticket.items
      .filter(
        (ti) =>
          !(ti.name.trim().toLowerCase() === normalizedDrug && ti.unit === unit) &&
          (ti.receivedQty ?? 0) < Number(ti.qty),
      )
      .map((ti) => ({
        name: ti.name,
        qty: Number(ti.qty) - (ti.receivedQty ?? 0),
        unit: ti.unit,
      }));

    const line: PreviewLine = {
      ticketId,
      ticketNo: ticket.no,
      patientName: ticket.name,
      willReceive,
      becomesReady,
      pendingOtherItems,
    };

    if (becomesReady) readyLines.push(line);
    else partialLines.push(line);
  }

  return {
    readyLines,
    partialLines,
    allCovered: allocated.size === candidates.length && candidates.length > 0,
    hasAnyCandidates: candidates.length > 0,
  };
}

type DrugReceiveModalProps = {
  drugName: string;
  unit: string;
  tickets: Ticket[];
  onConfirm: (qty: number) => Promise<void>;
  onClose: () => void;
};

export function DrugReceiveModal({
  drugName,
  unit,
  tickets,
  onConfirm,
  onClose,
}: DrugReceiveModalProps) {
  const [qtyInput, setQtyInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const qty = Number(qtyInput);
  const isValidQty = qtyInput.trim() !== '' && qty > 0 && Number.isFinite(qty);

  const preview = useMemo<ReceiptPreview | null>(() => {
    if (!isValidQty) return null;
    return computePreview(tickets, drugName, unit, qty);
  }, [tickets, drugName, unit, qty, isValidQty]);

  async function handleConfirm() {
    if (!isValidQty) return;
    setSubmitting(true);
    setError('');
    try {
      await onConfirm(qty);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-[16px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[480px] overflow-y-auto rounded-[20px] border border-[#e7eef7] bg-white shadow-xl" style={{ maxHeight: 'calc(100dvh - 48px)' }}>
        <div className="border-b border-[#eef2f7] px-[24px] py-[20px]">
          <div className="text-[13px] text-[#94a3b8]">รับยาเข้าสต็อก</div>
          <h2 className="mt-[2px] text-[18px] font-bold text-[#0f172a]">{drugName}</h2>
        </div>

        <div className="px-[24px] py-[20px]">
          <label className="mb-[6px] block text-[13px] font-semibold text-[#475569]">
            จำนวนที่รับเข้า
          </label>
          <div className="flex items-center gap-[10px]">
            <input
              type="number"
              min="1"
              step="1"
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              placeholder="0"
              className="w-full rounded-[12px] border border-[#cbd5e1] px-[14px] py-[11px] text-[16px] font-semibold tabular-nums text-[#0f172a] outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,.15)]"
              autoFocus
            />
            <span className="shrink-0 text-[14px] font-medium text-[#64748b]">{unit}</span>
          </div>

          {preview && (
            <div className="mt-[16px] flex flex-col gap-[10px]">
              {!preview.hasAnyCandidates && (
                <div className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] px-[14px] py-[12px] text-[13.5px] text-[#64748b]">
                  ไม่มีรายการค้างสำหรับยานี้
                </div>
              )}

              {preview.readyLines.length > 0 && (
                <div className="overflow-hidden rounded-[12px] border border-[#a7f3d0] bg-[#ecfdf5]">
                  <div className="border-b border-[#a7f3d0] px-[14px] py-[10px]">
                    <span className="text-[13px] font-bold text-[#047857]">
                      ✅ พร้อมรับยา ({preview.readyLines.length} ราย)
                    </span>
                  </div>
                  <div className="divide-y divide-[#d1fae5]">
                    {preview.readyLines.map((line) => (
                      <div
                        key={line.ticketId}
                        className="flex items-center justify-between gap-[10px] px-[14px] py-[10px]"
                      >
                        <div>
                          <div className="text-[13.5px] font-semibold text-[#0f172a]">
                            {line.patientName}
                          </div>
                          <div className="text-[12px] text-[#64748b]">{line.ticketNo}</div>
                        </div>
                        <span className="shrink-0 text-[13px] font-bold tabular-nums text-[#047857]">
                          {line.willReceive} {unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preview.partialLines.length > 0 && (
                <div className="overflow-hidden rounded-[12px] border border-[#bae6fd] bg-[#f0f9ff]">
                  <div className="border-b border-[#bae6fd] px-[14px] py-[10px]">
                    <span className="text-[13px] font-bold text-[#0369a1]">
                      ⏳ ตัดจำนวนแล้ว รอยาอื่นในใบ ({preview.partialLines.length} ราย)
                    </span>
                  </div>
                  <div className="divide-y divide-[#e0f2fe]">
                    {preview.partialLines.map((line) => (
                      <div key={line.ticketId} className="px-[14px] py-[10px]">
                        <div className="flex items-center justify-between gap-[10px]">
                          <div>
                            <div className="text-[13.5px] font-semibold text-[#0f172a]">
                              {line.patientName}
                            </div>
                            <div className="text-[12px] text-[#64748b]">{line.ticketNo}</div>
                          </div>
                          <span className="shrink-0 text-[13px] font-bold tabular-nums text-[#0369a1]">
                            {line.willReceive} {unit} ✓
                          </span>
                        </div>
                        {line.pendingOtherItems.length > 0 && (
                          <div className="mt-[6px] flex flex-wrap gap-[6px]">
                            {line.pendingOtherItems.map((other, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-[4px] rounded-full border border-[#e0f2fe] bg-white px-[8px] py-[2px] text-[11.5px] text-[#64748b]"
                              >
                                {other.name} {other.qty} {other.unit} ⏳
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preview.allCovered && preview.hasAnyCandidates && (
                <div className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] px-[14px] py-[10px] text-[12.5px] text-[#64748b]">
                  📦 ครบทุกรายที่ค้าง — ยาส่วนเกินจะนำไปจ่ายให้คนไข้ปัจจุบัน
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-[12px] rounded-[10px] border border-[#fecdd3] bg-[#fff1f2] px-[14px] py-[10px] text-[13px] text-[#be123c]">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-[10px] border-t border-[#eef2f7] px-[24px] py-[16px]">
          <button
            onClick={onClose}
            disabled={submitting}
            className="cursor-pointer rounded-[12px] border border-[#e2e8f0] bg-white px-[18px] py-[10px] text-[14px] font-semibold text-[#475569] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60"
          >
            ยกเลิก
          </button>
          <button
            onClick={() => void handleConfirm()}
            disabled={!isValidQty || submitting || preview?.hasAnyCandidates === false}
            className="cursor-pointer rounded-[12px] border-0 bg-[#2563eb] px-[18px] py-[10px] text-[14px] font-bold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'กำลังบันทึก...' : 'ยืนยันรับยาเข้า'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: ไม่มี error

- [ ] **Step 3: Commit**

```bash
git add src/components/DrugReceiveModal.tsx
git commit -m "feat: add DrugReceiveModal with client-side FIFO preview"
```

---

### Task 4: Wire OutstandingDrugsPage + App.tsx

**Files:**
- Modify: `src/pages/OutstandingDrugsPage.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `DrugReceiveModal` จาก Task 3, `receiveDrugStock` + `DrugReceiptResult` จาก Task 2

- [ ] **Step 1: เพิ่ม `onReceiveDrug` prop ใน `OutstandingDrugsPage`**

เปิด `src/pages/OutstandingDrugsPage.tsx`

แก้ `OutstandingDrugsPageProps`:
```typescript
type OutstandingDrugsPageProps = {
  tickets: Ticket[];
  drugs: Drug[];
  onView: (ticketId: string) => void;
  onReceiveDrug: (drugName: string, unit: string, qty: number) => Promise<void>;
};
```

แก้ function signature:
```typescript
export function OutstandingDrugsPage({ tickets, drugs, onView, onReceiveDrug }: OutstandingDrugsPageProps) {
```

- [ ] **Step 2: เพิ่ม import และ modal state**

เพิ่ม import บนสุดของไฟล์ (ต่อจาก `import { useMemo, useState } from 'react';`):

```typescript
import { DrugReceiveModal } from '../components/DrugReceiveModal';
```

เพิ่ม state ใน body ของ component (ต่อจาก `const [expanded, setExpanded] = useState<string | null>(null);`):

```typescript
const [receiveTarget, setReceiveTarget] = useState<{ name: string; unit: string } | null>(null);
```

- [ ] **Step 3: เพิ่มปุ่ม "รับยาเข้า" ในแต่ละ drug card**

ปัจจุบัน drug card คือ `<button>` ตัวเดียว ไม่สามารถใส่ `<button>` อื่นซ้อนได้ (invalid HTML)
วิธีแก้: เปลี่ยน outer `<button>` เป็น `<div role="button">` แล้วเพิ่ม "รับยาเข้า" เป็น sibling

**สิ่งที่ต้องทำ** ใน `filtered.map((drug) => ...)`:

1. ห่อ drug card ด้วย `<div className="flex">` ใหม่
2. เปลี่ยน `<button onClick={() => setExpanded(...)}>` เป็น:
   ```tsx
   <div
     role="button"
     tabIndex={0}
     onClick={() => setExpanded(isOpen ? null : drug.key)}
     onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(isOpen ? null : drug.key); }}
     className="grid flex-1 cursor-pointer grid-cols-[1fr_auto] items-center gap-x-[12px] gap-y-[6px] border-0 bg-transparent px-[20px] py-[13px] text-left hover:bg-[#f8fafc] min-[760px]:grid-cols-[1fr_100px_84px_110px_120px_44px]"
   >
   ```
   — **inner content ทุกอย่างเหมือนเดิมทั้งหมด** ไม่ต้องแก้อะไรข้างใน
3. ปิดด้วย `</div>` แทน `</button>`
4. เพิ่ม "รับยาเข้า" button เป็น sibling ถัดจาก `</div>` ที่เพิ่งปิด:

```tsx
{drug.preparingQty > 0 && (
  <button
    onClick={() => setReceiveTarget({ name: drug.name, unit: drug.unit })}
    className="flex shrink-0 cursor-pointer items-center self-stretch border-0 bg-transparent px-[14px] text-[12.5px] font-semibold text-[#1d4ed8] hover:bg-[#eff6ff]"
  >
    รับยาเข้า
  </button>
)}
```

โครงสร้างหลังแก้:
```tsx
<div key={drug.key}>
  <div className="flex">                          {/* wrapper ใหม่ */}
    <div role="button" tabIndex={0} onClick={...} onKeyDown={...} className="grid flex-1 ...">
      {/* เนื้อหาเดิมทุกอย่าง ไม่เปลี่ยน */}
    </div>
    {drug.preparingQty > 0 && (
      <button onClick={() => setReceiveTarget(...)}>รับยาเข้า</button>
    )}
  </div>
  {isOpen && (
    <div className="bg-[#f8fafc] ...">           {/* expanded section เดิม ไม่เปลี่ยน */}
      ...
    </div>
  )}
</div>
```

- [ ] **Step 4: Render `DrugReceiveModal`**

เพิ่มก่อน `</div>` ปิดสุดของ `return (...)` ใน `OutstandingDrugsPage`:

```tsx
{receiveTarget && (
  <DrugReceiveModal
    drugName={receiveTarget.name}
    unit={receiveTarget.unit}
    tickets={tickets}
    onConfirm={async (qty) => {
      await onReceiveDrug(receiveTarget.name, receiveTarget.unit, qty);
    }}
    onClose={() => setReceiveTarget(null)}
  />
)}
```

- [ ] **Step 5: เพิ่ม `handleReceiveDrug` ใน `App.tsx`**

เพิ่ม `receiveDrugStock` ใน import จาก `ticketService`:

```typescript
import {
  createTicket,
  deleteTicket,
  getPublicStatusByToken,
  getTicketAuditHistory,
  listTickets,
  lookupTicketStatus,
  lookupTicketStatusByDate,
  receiveDrugStock,
  updateStatus,
  updateTicket,
} from './services/ticketService';
```

เพิ่ม function ใน `App()` ก่อน `return (...)`:

```typescript
async function handleReceiveDrug(drugName: string, unit: string, qty: number): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('ฟีเจอร์นี้ใช้งานได้เฉพาะเมื่อเชื่อมต่อฐานข้อมูลเท่านั้น');
  }
  try {
    setLoading(true);
    const result = await receiveDrugStock(drugName, unit, qty);
    await reloadTickets();
    const parts: string[] = [];
    if (result.readyTicketIds.length > 0)
      parts.push(`เปลี่ยนสถานะพร้อมรับ ${result.readyTicketIds.length} ราย`);
    if (result.partialTicketIds.length > 0)
      parts.push(`ตัดจำนวน ${result.partialTicketIds.length} ราย`);
    showToast(parts.length > 0 ? parts.join(' · ') : 'ไม่มีรายการค้างสำหรับยานี้');
  } catch (error) {
    await showError('รับยาเข้าไม่สำเร็จ', error);
    throw error;
  } finally {
    setLoading(false);
  }
}
```

- [ ] **Step 6: ส่ง `onReceiveDrug` prop ไปยัง `OutstandingDrugsPage`**

หาบรรทัดนี้ใน `App.tsx`:

```tsx
{route === 'outstanding' && <OutstandingDrugsPage tickets={tickets} drugs={drugs} onView={(id) => navigate('detail', id)} />}
```

แก้เป็น:

```tsx
{route === 'outstanding' && (
  <OutstandingDrugsPage
    tickets={tickets}
    drugs={drugs}
    onView={(id) => navigate('detail', id)}
    onReceiveDrug={handleReceiveDrug}
  />
)}
```

- [ ] **Step 7: Type check ครั้งสุดท้าย**

```bash
npx tsc --noEmit
```

Expected: ไม่มี error ใดๆ

- [ ] **Step 8: ทดสอบใน browser**

1. เปิดแอป login → ไปหน้า "ยาค้างคนไข้"
2. ตรวจว่าเห็นปุ่ม "รับยาเข้า" ที่ drug card ที่มี `preparingQty > 0` (ไม่มีที่ card ที่ `readyQty` เท่านั้น)
3. กดปุ่ม → modal เปิด แสดงชื่อยาและหน่วยถูกต้อง
4. กรอกจำนวนที่มากพอสำหรับผู้ป่วยคนแรก → preview แสดง "✅ พร้อมรับยา 1 ราย"
5. เพิ่มจำนวนให้ครบหลายคน → preview อัปเดต real-time
6. ทดสอบ edge case: กรอกจำนวนที่เกินยอดค้างทั้งหมด → แสดง "📦 ครบทุกรายที่ค้าง"
7. กดยืนยัน → modal ปิด, toast แสดง "เปลี่ยนสถานะพร้อมรับ N ราย"
8. ไปหน้า "รายการใบค้างรับยา" → ตรวจสถานะ ticket ที่ควรเปลี่ยนเป็น "พร้อมรับยา" แล้ว
9. เข้า ticket detail ของ ticket ที่ถูกเปลี่ยน → Audit log แสดง "เปลี่ยนสถานะเป็น พร้อมรับยา"
10. ทดสอบ ticket ที่มีหลายยา: ให้มีบางรายการยังไม่มา → ticket ยังเป็น "กำลังเตรียมยา", preview แสดง "⏳ ตัดจำนวนแล้ว รอยาอื่นในใบ"

- [ ] **Step 9: Commit**

```bash
git add src/pages/OutstandingDrugsPage.tsx src/App.tsx
git commit -m "feat: wire drug receive modal in OutstandingDrugsPage"
```
