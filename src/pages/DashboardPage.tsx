import type { Ticket, TicketStatus } from '../types/backorder';
import { STATUSES } from '../utils/status';
import { todayThai } from '../utils/format';
import { Icon } from '../components/Icon';
import { TicketRows } from '../components/TicketRows';

type DashboardPageProps = {
  tickets: Ticket[];
  onCreate: () => void;
  onList: (status?: TicketStatus | 'all') => void;
  onView: (ticketId: string) => void;
  onPrint: (ticketId: string) => void;
};

export function DashboardPage({
  tickets,
  onCreate,
  onList,
  onView,
  onPrint,
}: DashboardPageProps) {
  const count = (status: TicketStatus) => tickets.filter((ticket) => ticket.status === status).length;
  const cards = [
    { key: 'all' as const, label: 'ใบค้างทั้งหมด', value: tickets.length, dot: '#2563eb' },
    ...(['preparing', 'ready', 'picked_up', 'cancelled'] as TicketStatus[]).map((status) => ({
      key: status,
      label: status === 'preparing' ? 'กำลังเตรียม' : STATUSES[status].label,
      value: count(status),
      dot: STATUSES[status].dot,
    })),
  ];
  const recent = [...tickets].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8);

  return (
    <div className="animate-fade-up">
      <div className="mb-[22px] flex flex-wrap items-end justify-between gap-[14px]">
        <div>
          <h1 className="mb-[4px] text-[clamp(20px,3vw,26px)] font-bold text-[#0f172a]">ภาพรวมระบบ</h1>
          <p className="text-[13.5px] text-[#64748b]">{todayThai()}</p>
        </div>
        <button onClick={onCreate} className="inline-flex cursor-pointer items-center gap-[8px] rounded-[12px] border-0 bg-[#2563eb] px-[18px] py-[11px] text-[14px] font-bold text-white hover:bg-[#1d4ed8]"><Icon name="plus" size={18} strokeWidth={2.2} />สร้างใบค้างยา</button>
      </div>

      <div className="mb-[26px] grid grid-cols-[repeat(auto-fit,minmax(165px,1fr))] gap-[13px]">
        {cards.map((card) => (
          <button key={card.key} onClick={() => onList(card.key)} className="flex cursor-pointer flex-col gap-[10px] rounded-[16px] border border-[#e7eef7] bg-white px-[18px] py-[16px] text-left transition hover:-translate-y-[2px] hover:border-[#bfdbfe] hover:shadow-[0_12px_26px_-18px_rgba(15,42,90,.5)]">
            <div className="flex items-center gap-[8px]"><span className="h-[9px] w-[9px] rounded-full" style={{ background: card.dot }} /><span className="text-[13px] font-medium text-[#64748b]">{card.label}</span></div>
            <div className="flex items-end gap-[6px]"><span className="text-[30px] font-bold leading-none tabular-nums text-[#0f172a]">{card.value}</span><span className="mb-[3px] text-[12.5px] text-[#94a3b8]">ใบ</span></div>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[18px] border border-[#e7eef7] bg-white">
        <div className="flex items-center justify-between gap-[10px] border-b border-[#eef2f7] px-[20px] py-[18px]">
          <h2 className="text-[16px] font-bold text-[#0f172a]">ใบค้างยาล่าสุด</h2>
          <button onClick={() => onList('all')} className="cursor-pointer border-0 bg-transparent text-[13px] font-semibold text-[#2563eb]">ดูทั้งหมด →</button>
        </div>
        <TicketRows tickets={recent} mode="recent" onView={onView} onPrint={onPrint} />
      </div>
    </div>
  );
}
