import type { Ticket } from '../types/backorder';
import { uscLogo } from '../uiAssets';
import { formatThaiDate } from '../utils/format';
import { Icon } from '../components/Icon';

type PrintPageProps = {
  ticket: Ticket;
  qrUrl: string;
  onBack: () => void;
  onPublicView: () => void;
};

export function PrintPage({ ticket, qrUrl, onBack, onPublicView }: PrintPageProps) {
  return (
    <div className="print-wrap flex min-h-screen flex-col items-center bg-[#e8eef6] px-[16px] py-[26px]">
      <div className="no-print mb-[18px] flex w-full max-w-[520px] gap-[10px]">
        <button onClick={onBack} className="flex-1 cursor-pointer rounded-[12px] border border-[#cbd5e1] bg-white p-[12px] text-[14px] font-semibold text-[#475569] hover:bg-[#f8fafc]">← กลับไปรายละเอียด</button>
        <button onClick={() => window.print()} className="inline-flex flex-1 cursor-pointer items-center justify-center gap-[7px] rounded-[12px] border-0 bg-[#2563eb] p-[12px] text-[14px] font-bold text-white hover:bg-[#1d4ed8]"><Icon name="printer" size={17} />พิมพ์ใบค้างยา</button>
      </div>

      <div className="print-paper w-full max-w-[520px] rounded-[14px] border border-[#e2e8f0] bg-white px-[28px] py-[24px] shadow-[0_14px_36px_-20px_rgba(15,42,90,.45)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-dashed border-[#e2e8f0] pb-[14px]">
          <div className="flex items-center gap-[11px]">
            <img src={uscLogo} alt="USC+" className="h-[40px]" />
            <div className="leading-[1.3]">
              <div className="text-[16px] font-bold text-[#0f172a]">ใบค้างยา</div>
              <div className="text-[11px] text-[#64748b]">ห้องยา USC+ · โรงพยาบาลอุตรดิตถ์</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide text-[#94a3b8]">เลขที่ใบค้างยา</div>
            <div className="text-[15px] font-bold tabular-nums text-[#1d4ed8]">{ticket.no}</div>
            <div className="text-[11px] text-[#64748b]">{formatThaiDate(ticket.createdAt)}</div>
          </div>
        </div>

        {/* Patient info */}
        <div className="mt-[14px] grid grid-cols-2 gap-x-[20px] gap-y-[8px] rounded-[10px] bg-[#f8fafc] px-[14px] py-[12px]">
          <InfoRow label="ชื่อ-สกุล" value={ticket.name} />
          <InfoRow label="HN" value={ticket.hn && ticket.hn !== '-' ? ticket.hn : '—'} />
          <InfoRow label="เบอร์โทรศัพท์" value={ticket.phone || '—'} />
          {ticket.note && <InfoRow label="หมายเหตุ" value={ticket.note} className="col-span-2" />}
        </div>

        {/* Drug list */}
        <div className="mt-[14px]">
          <div className="mb-[6px] text-[11.5px] font-semibold text-[#475569]">รายการยาที่ค้าง ({ticket.items.length} รายการ)</div>
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[#e2e8f0] text-left text-[10.5px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                <th className="pb-[6px] pr-[8px] w-[22px]">#</th>
                <th className="pb-[6px] pr-[8px]">ชื่อยา</th>
                <th className="pb-[6px] pr-[8px] text-right w-[52px]">จำนวน</th>
                <th className="pb-[6px] pr-[8px] w-[48px]">หน่วย</th>
                <th className="pb-[6px] text-[#64748b]">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {ticket.items.map((item, i) => (
                <tr key={item.id} className="border-b border-[#f1f5f9] last:border-0">
                  <td className="py-[5px] pr-[8px] text-[#94a3b8]">{i + 1}</td>
                  <td className="py-[5px] pr-[8px] font-medium text-[#0f172a]">{item.name}</td>
                  <td className="py-[5px] pr-[8px] text-right tabular-nums text-[#334155]">{item.qty}</td>
                  <td className="py-[5px] pr-[8px] text-[#64748b]">{item.unit}</td>
                  <td className="py-[5px] text-[#64748b]">{item.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* QR + URL */}
        <div className="mt-[16px] flex items-center gap-[16px] border-t border-dashed border-[#e2e8f0] pt-[16px]">
          <div className="shrink-0">
            {qrUrl
              ? <img src={qrUrl} alt="QR Code" className="h-[110px] w-[110px] rounded-[6px] border border-[#eef2f7] [image-rendering:pixelated]" />
              : <div className="flex h-[110px] w-[110px] items-center justify-center rounded-[6px] border border-dashed border-[#cbd5e1] text-[11px] text-[#94a3b8]">กำลังสร้าง...</div>
            }
          </div>
          <div>
            <div className="text-[11.5px] font-semibold text-[#334155]">สแกน QR เพื่อตรวจสอบสถานะยา</div>
            <div className="mt-[10px] text-[10.5px] text-[#64748b]">กรุณาแสดงใบนี้เมื่อมารับยา</div>
          </div>
        </div>

        {/* Signature */}
        <div className="mt-[16px] grid grid-cols-2 gap-[20px] border-t border-dashed border-[#e2e8f0] pt-[14px]">
          <SignBox label="ลายมือชื่อเภสัชกร" />
          <SignBox label="ลายมือชื่อผู้รับยา" />
        </div>

        <div className="mt-[14px] text-center text-[10px] text-[#cbd5e1]">
          USC Pharmacy Backlog System · กระทรวงสาธารณสุข
        </div>
      </div>

      <button onClick={onPublicView} className="no-print mt-[18px] cursor-pointer border-0 bg-transparent text-[13px] font-semibold text-[#64748b] hover:text-[#2563eb]">เปิดหน้าสถานะที่ผู้ป่วยเห็น →</button>
    </div>
  );
}

function InfoRow({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <span className="text-[10.5px] text-[#94a3b8]">{label}: </span>
      <span className="text-[12.5px] font-semibold text-[#0f172a]">{value}</span>
    </div>
  );
}

function SignBox({ label }: { label: string }) {
  return (
    <div>
      <div className="h-[40px] border-b border-[#e2e8f0]" />
      <div className="mt-[4px] text-center text-[10.5px] text-[#94a3b8]">({label})</div>
    </div>
  );
}
