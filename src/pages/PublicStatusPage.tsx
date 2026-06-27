import type { Ticket } from '../types/backorder';
import { uscLogo } from '../uiAssets';
import { formatThaiDate } from '../utils/format';
import { STATUSES } from '../utils/status';
import { Icon } from '../components/Icon';

type PublicStatusPageProps = {
  ticket: Ticket | null;
  loading: boolean;
  onRefresh: () => void;
  onLookup: () => void;
};

export function PublicStatusPage({
  ticket,
  loading,
  onRefresh,
  onLookup,
}: PublicStatusPageProps) {
  if (!ticket) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[linear-gradient(180deg,#eef4fb_0%,#dbe9fb_100%)] px-[18px] py-[36px]">
        <img src={uscLogo} alt="USC+" className="mb-[22px] h-[42px]" />
        <div className="w-full max-w-[460px] rounded-[22px] border border-[#e2e8f0] bg-white px-[24px] py-[36px] text-center shadow-[0_20px_46px_-28px_rgba(15,42,90,.45)]">
          <h1 className="mb-[8px] text-[22px] font-bold text-[#0f172a]">{loading ? 'กำลังตรวจสอบสถานะ...' : 'ไม่พบข้อมูลใบค้างยา'}</h1>
          <p className="text-[14px] text-[#64748b]">กรุณาตรวจสอบลิงก์ QR Code หรือค้นหาด้วยเลขใบค้างยาอีกครั้ง</p>
        </div>
        <button onClick={onLookup} className="mt-[20px] cursor-pointer border-0 bg-transparent text-[13.5px] font-semibold text-[#64748b] hover:text-[#2563eb]">← ตรวจสอบรายการอื่น</button>
      </div>
    );
  }

  const status = STATUSES[ticket.status];
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[linear-gradient(180deg,#eef4fb_0%,#dbe9fb_100%)] px-[18px] py-[36px]">
      <div className="animate-fade-up mb-[22px] flex flex-col items-center gap-[8px]">
        <img src={uscLogo} alt="USC+" className="h-[42px]" />
        <div className="text-[12.5px] text-[#64748b]">ระบบตรวจสอบสถานะยาออนไลน์</div>
      </div>
      <div className="animate-fade-up-slow w-full max-w-[460px] rounded-[22px] border border-[#e2e8f0] bg-white px-[24px] pb-[28px] pt-[26px] shadow-[0_20px_46px_-28px_rgba(15,42,90,.45)]">
        <div className="mb-[20px] text-center"><div className="text-[13px] text-[#94a3b8]">ใบค้างยาเลขที่</div><div className="text-[22px] font-bold tracking-[.02em] tabular-nums text-[#0f172a]">{ticket.no}</div></div>
        <div className="rounded-[18px] border px-[22px] py-[30px] text-center" style={{ background: status.bg, borderColor: status.border }}>
          <span className="mb-[16px] inline-flex h-[68px] w-[68px] items-center justify-center rounded-full" style={{ background: status.dot, boxShadow: `0 8px 20px -6px ${status.dot}` }}><span className="h-[30px] w-[30px] rounded-full border-[4px] border-white" /></span>
          <div className="text-[clamp(23px,6vw,30px)] font-bold leading-[1.2]" style={{ color: status.text }}>{status.label}</div>
          <p className="mt-[12px] whitespace-pre-line text-[15px] leading-[1.65] opacity-90" style={{ color: status.text }}>{ticket.publicMessage || status.msg}</p>
        </div>
        <div className="mt-[18px] flex items-center justify-center gap-[7px] text-[13px] text-[#94a3b8]"><Icon name="clock" size={15} />อัปเดตล่าสุด {formatThaiDate(ticket.updatedAt)}</div>
        <button onClick={onRefresh} disabled={loading} className="mt-[20px] flex w-full cursor-pointer items-center justify-center gap-[8px] rounded-[13px] border border-[#bfdbfe] bg-[#eff6ff] p-[14px] text-[15px] font-bold text-[#1d4ed8] hover:bg-[#dbeafe]"><Icon name="refresh" size={18} />{loading ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสถานะอีกครั้ง'}</button>
        <div className="mt-[16px] flex items-start gap-[8px] rounded-[12px] bg-[#f8fafc] px-[14px] py-[12px] text-[12.5px] leading-[1.55] text-[#94a3b8]"><span className="mt-px shrink-0">🔒</span>เพื่อความปลอดภัย หน้านี้จะไม่แสดงข้อมูลส่วนตัวของผู้ป่วย หากมีข้อสงสัยกรุณาติดต่อห้องยาในเวลาทำการ</div>
      </div>
      <button onClick={onLookup} className="mt-[20px] cursor-pointer border-0 bg-transparent text-[13.5px] font-semibold text-[#64748b] hover:text-[#2563eb]">← ตรวจสอบรายการอื่น</button>
    </div>
  );
}
