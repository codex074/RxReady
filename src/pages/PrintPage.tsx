import type { Ticket } from '../types/backorder';
import { formatThaiDate } from '../utils/format';
import { publicStatusUrl } from '../utils/qr';
import { Icon } from '../components/Icon';

type PrintPageProps = {
  ticket: Ticket;
  qrUrl: string;
  onBack: () => void;
  onPublicView: () => void;
};

export function PrintPage({ ticket, qrUrl, onBack, onPublicView }: PrintPageProps) {
  const statusUrl = publicStatusUrl(ticket.token);
  return (
    <div className="print-wrap flex min-h-screen flex-col items-center bg-[#e8eef6] px-[16px] py-[26px]">
      <div className="no-print mb-[18px] flex w-full max-w-[420px] gap-[10px]">
        <button onClick={onBack} className="flex-1 cursor-pointer rounded-[12px] border border-[#cbd5e1] bg-white p-[12px] text-[14px] font-semibold text-[#475569] hover:bg-[#f8fafc]">← กลับไปรายละเอียด</button>
        <button onClick={() => window.print()} className="inline-flex flex-1 cursor-pointer items-center justify-center gap-[7px] rounded-[12px] border-0 bg-[#2563eb] p-[12px] text-[14px] font-bold text-white hover:bg-[#1d4ed8]"><Icon name="printer" size={17} />พิมพ์</button>
      </div>

      <div className="print-paper w-full max-w-[400px] rounded-[14px] border border-[#e2e8f0] bg-white px-[24px] py-[26px] shadow-[0_14px_36px_-20px_rgba(15,42,90,.45)]">
        <div className="flex items-center gap-[11px] border-b-2 border-dashed border-[#e2e8f0] pb-[15px]">
          <img src="/assets/usc-logo.png" alt="USC+" className="h-[38px]" />
          <div className="leading-[1.25]"><div className="text-[15px] font-bold text-[#0f172a]">ใบค้างยา</div><div className="text-[11px] text-[#64748b]">ห้องยา USC+ · รพ.อุตรดิตถ์</div></div>
          <div className="ml-auto text-right"><div className="text-[10.5px] text-[#94a3b8]">เลขที่</div><div className="text-[14px] font-bold tabular-nums text-[#1d4ed8]">{ticket.no}</div></div>
        </div>
        <div className="flex justify-between gap-[12px] py-[15px]">
          <div><div className="mb-[2px] text-[11px] text-[#94a3b8]">ชื่อผู้ป่วย</div><div className="text-[14px] font-semibold text-[#0f172a]">{ticket.name}</div></div>
          <div className="text-right"><div className="mb-[2px] text-[11px] text-[#94a3b8]">วันที่ออกใบ</div><div className="text-[13px] font-semibold text-[#334155]">{formatThaiDate(ticket.createdAt)}</div></div>
        </div>
        <div className="rounded-[12px] bg-[#f8fafc] px-[15px] py-[13px]">
          <div className="mb-[8px] text-[11.5px] text-[#94a3b8]">รายการยาที่ค้าง ({ticket.items.length} รายการ)</div>
          {ticket.items.map((item) => <div key={item.id} className="flex justify-between gap-[10px] py-[4px] text-[13.5px]"><span className="text-[#334155]">{item.name}</span><span className="whitespace-nowrap tabular-nums text-[#64748b]">{item.qty} {item.unit}</span></div>)}
        </div>
        <div className="pt-[20px] text-center">
          <div className="mb-[13px] text-[13px] font-semibold text-[#334155]">สแกนเพื่อตรวจสอบสถานะยา</div>
          {qrUrl ? <img src={qrUrl} alt="QR Code" className="h-[186px] w-[186px] rounded-[8px] border border-[#eef2f7] [image-rendering:pixelated]" /> : <div className="mx-auto flex h-[186px] w-[186px] items-center justify-center rounded-[8px] border border-dashed border-[#cbd5e1] text-[12.5px] text-[#94a3b8]">กำลังสร้าง QR...</div>}
          <div className="mt-[12px] break-all text-[10.5px] text-[#94a3b8]">{statusUrl.replace(/^https?:\/\//, '')}</div>
        </div>
        <div className="mt-[16px] border-t border-dashed border-[#e2e8f0] pt-[13px] text-center text-[10.5px] text-[#cbd5e1]">USC Pharmacy Backlog System · กระทรวงสาธารณสุข</div>
      </div>
      <button onClick={onPublicView} className="no-print mt-[18px] cursor-pointer border-0 bg-transparent text-[13px] font-semibold text-[#64748b] hover:text-[#2563eb]">เปิดหน้าสถานะที่ผู้ป่วยเห็น →</button>
    </div>
  );
}
