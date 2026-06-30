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
