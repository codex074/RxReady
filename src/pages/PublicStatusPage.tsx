import type { Ticket } from '../types/backorder';
import { uscLogo } from '../uiAssets';
import { formatThaiDate } from '../utils/format';
import { STATUSES } from '../utils/status';
import { Icon } from '../components/Icon';

type PublicStatusPageProps = {
  tickets: Ticket[];
  loading: boolean;
  onRefresh: () => void;
  onLookup: () => void;
};

function TicketCard({ ticket }: { ticket: Ticket }) {
  const status = STATUSES[ticket.status];
  return (
    <div className="w-full max-w-[460px] rounded-[22px] border border-[#e2e8f0] bg-white px-[24px] pb-[24px] pt-[22px] shadow-[0_20px_46px_-28px_rgba(15,42,90,.45)]">
      <div className="mb-[16px] text-center">
        <div className="text-[13px] text-[#94a3b8]">ใบค้างรับยาเลขที่</div>
        <div className="text-[22px] font-bold tracking-[.02em] tabular-nums text-[#0f172a]">{ticket.no}</div>
      </div>
      <div className="rounded-[18px] border px-[22px] py-[26px] text-center" style={{ background: status.bg, borderColor: status.border }}>
        <span className="mb-[14px] inline-flex h-[60px] w-[60px] items-center justify-center rounded-full" style={{ background: status.dot, boxShadow: `0 8px 20px -6px ${status.dot}` }}>
          <span className="h-[26px] w-[26px] rounded-full border-[4px] border-white" />
        </span>
        <div className="text-[clamp(20px,5vw,26px)] font-bold leading-[1.2]" style={{ color: status.text }}>{status.label}</div>
        <p className="mt-[10px] whitespace-pre-line text-[14px] leading-[1.65] opacity-90" style={{ color: status.text }}>{ticket.publicMessage || status.msg}</p>
      </div>
      <div className="mt-[14px] flex items-center justify-center gap-[7px] text-[12.5px] text-[#94a3b8]">
        <Icon name="clock" size={14} />อัปเดตล่าสุด {formatThaiDate(ticket.updatedAt)}
      </div>
    </div>
  );
}

export function PublicStatusPage({ tickets, loading, onRefresh, onLookup }: PublicStatusPageProps) {
  if (!tickets.length) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[linear-gradient(180deg,#eef4fb_0%,#dbe9fb_100%)] px-[18px] py-[36px]">
        <img src={uscLogo} alt="USC+" className="mb-[22px] h-[42px]" />
        <div className="w-full max-w-[460px] rounded-[22px] border border-[#e2e8f0] bg-white px-[24px] py-[36px] text-center shadow-[0_20px_46px_-28px_rgba(15,42,90,.45)]">
          <h1 className="mb-[8px] text-[22px] font-bold text-[#0f172a]">{loading ? 'กำลังตรวจสอบสถานะ...' : 'ไม่พบข้อมูลใบค้างรับยา'}</h1>
          <p className="text-[14px] text-[#64748b]">กรุณาตรวจสอบลิงก์ QR Code หรือค้นหาด้วยวันที่รับบริการอีกครั้ง</p>
        </div>
        <button onClick={onLookup} className="mt-[20px] cursor-pointer border-0 bg-transparent text-[13.5px] font-semibold text-[#64748b] hover:text-[#2563eb]">← ตรวจสอบรายการอื่น</button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-[linear-gradient(180deg,#eef4fb_0%,#dbe9fb_100%)] px-[18px] py-[36px]">
      <div className="animate-fade-up mb-[22px] flex flex-col items-center gap-[8px]">
        <img src={uscLogo} alt="USC+" className="h-[42px]" />
        <div className="text-[12.5px] text-[#64748b]">ระบบตรวจสอบสถานะยาออนไลน์</div>
      </div>

      {tickets.length > 1 && (
        <div className="animate-fade-up mb-[16px] w-full max-w-[460px] rounded-[14px] border border-[#bfdbfe] bg-[#eff6ff] px-[16px] py-[11px] text-center text-[13.5px] font-semibold text-[#1d4ed8]">
          พบ {tickets.length} ใบค้างรับยาในวันที่เดียวกัน
        </div>
      )}

      <div className="animate-fade-up-slow flex w-full flex-col items-center gap-[16px]">
        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>

      <div className="mt-[20px] w-full max-w-[460px]">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex w-full cursor-pointer items-center justify-center gap-[8px] rounded-[13px] border border-[#bfdbfe] bg-[#eff6ff] p-[14px] text-[15px] font-bold text-[#1d4ed8] hover:bg-[#dbeafe] disabled:opacity-60"
        >
          <Icon name="refresh" size={18} />{loading ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสถานะอีกครั้ง'}
        </button>
        <div className="mt-[14px] flex items-start gap-[8px] rounded-[12px] bg-[rgba(255,255,255,.7)] px-[14px] py-[12px] text-[12.5px] leading-[1.55] text-[#94a3b8]">
          <span className="mt-px shrink-0">🔒</span>เพื่อความปลอดภัย หน้านี้จะไม่แสดงข้อมูลส่วนตัวของผู้ป่วย หากมีข้อสงสัยกรุณาติดต่อห้องยาในเวลาทำการ
        </div>
      </div>

      <button onClick={onLookup} className="mt-[20px] cursor-pointer border-0 bg-transparent text-[13.5px] font-semibold text-[#64748b] hover:text-[#2563eb]">← ตรวจสอบรายการอื่น</button>
    </div>
  );
}
