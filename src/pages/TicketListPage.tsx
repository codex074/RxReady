import { useEffect, useState } from 'react';
import type { Ticket, TicketStatus } from '../types/backorder';
import { STATUSES } from '../utils/status';
import { Icon } from '../components/Icon';
import { TicketRows } from '../components/TicketRows';

// จำนวนรายการต่อหน้า
const PAGE_SIZE = 20;

// ลำดับความสำคัญของสถานะ: กำลังเตรียมขึ้นก่อน, รับแล้ว/ยกเลิกไว้ท้ายสุด
const STATUS_PRIORITY: Record<TicketStatus, number> = {
  preparing: 0,
  ready: 1,
  picked_up: 2,
  cancelled: 3,
};

type TicketListPageProps = {
  tickets: Ticket[];
  query: string;
  statusFilter: TicketStatus | 'all';
  onQueryChange: (value: string) => void;
  onStatusChange: (status: TicketStatus | 'all') => void;
  onCreate: () => void;
  onView: (ticketId: string) => void;
  onEdit: (ticketId: string) => void;
  onDelete: (ticketId: string) => void;
  onPrint: (ticketId: string) => void;
  canDelete: boolean;
};

export function TicketListPage({
  tickets,
  query,
  statusFilter,
  onQueryChange,
  onStatusChange,
  onCreate,
  onView,
  onEdit,
  onDelete,
  onPrint,
  canDelete,
}: TicketListPageProps) {
  const [drugQuery, setDrugQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // กลับไปหน้าแรกทุกครั้งที่เงื่อนไขกรองเปลี่ยน
  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, drugQuery, dateFrom, dateTo]);

  const normalizedQuery = query.trim().toLowerCase();
  const normalizedDrug = drugQuery.trim().toLowerCase();
  const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : -Infinity;
  const toTs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : Infinity;

  const filtered = [...tickets]
    .filter((ticket) => {
      if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
      if (
        normalizedQuery &&
        ![ticket.no, ticket.hn, ticket.name].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        )
      ) {
        return false;
      }
      if (
        normalizedDrug &&
        !ticket.items.some((item) => item.name.toLowerCase().includes(normalizedDrug))
      ) {
        return false;
      }
      if (ticket.createdAt < fromTs || ticket.createdAt > toTs) return false;
      return true;
    })
    .sort((a, b) => {
      const priority = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
      if (priority !== 0) return priority;
      return a.createdAt - b.createdAt; // ภายในสถานะเดียวกัน เรียงจากเก่าสุดก่อน
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasActiveFilters = Boolean(
    normalizedQuery || normalizedDrug || dateFrom || dateTo || statusFilter !== 'all',
  );

  function clearFilters() {
    onQueryChange('');
    onStatusChange('all');
    setDrugQuery('');
    setDateFrom('');
    setDateTo('');
  }
  const filters: Array<{ key: TicketStatus | 'all'; label: string }> = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'preparing', label: 'กำลังเตรียม' },
    { key: 'ready', label: STATUSES.ready.label },
    { key: 'picked_up', label: STATUSES.picked_up.label },
    { key: 'cancelled', label: STATUSES.cancelled.label },
  ];

  return (
    <div className="animate-fade-up">
      <div className="mb-[20px] flex flex-wrap items-end justify-between gap-[14px]">
        <div><h1 className="mb-[4px] text-[clamp(20px,3vw,26px)] font-bold text-[#0f172a]">รายการใบค้างรับยา</h1><p className="text-[13.5px] text-[#64748b]">พบ {filtered.length} รายการ{totalPages > 1 ? ` · หน้า ${currentPage}/${totalPages}` : ''}</p></div>
        <button onClick={onCreate} className="inline-flex cursor-pointer items-center gap-[8px] rounded-[12px] border-0 bg-[#2563eb] px-[18px] py-[11px] text-[14px] font-bold text-white hover:bg-[#1d4ed8]"><Icon name="plus" size={18} strokeWidth={2.2} />สร้างใบค้างรับยา</button>
      </div>

      <div className="mb-[16px] rounded-[18px] border border-[#e7eef7] bg-white px-[18px] py-[16px]">
        <div className="relative mb-[14px]">
          <span className="absolute left-[14px] top-1/2 inline-flex -translate-y-1/2 text-[#94a3b8]"><Icon name="search" size={18} /></span>
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="ค้นหาด้วยเลขใบค้างรับยา, HN หรือชื่อผู้ป่วย" className="w-full rounded-[12px] border border-[#cbd5e1] py-[12px] pl-[42px] pr-[14px] text-[14px] text-[#0f172a] outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,.15)]" />
        </div>
        <div className="flex flex-wrap items-center gap-[8px]">
          <span className="mr-[2px] text-[12.5px] text-[#94a3b8]">สถานะ:</span>
          {filters.map((filter) => {
            const active = statusFilter === filter.key;
            return (
              <button key={filter.key} onClick={() => onStatusChange(filter.key)} className={`cursor-pointer rounded-full border px-[14px] py-[7px] text-[13px] font-semibold transition ${active ? 'border-[#2563eb] bg-[#2563eb] text-white' : 'border-[#e2e8f0] bg-white text-[#475569]'}`}>{filter.label}</button>
            );
          })}
        </div>

        <div className="mt-[14px] flex flex-wrap items-center gap-[10px] border-t border-[#eef2f7] pt-[14px]">
          <div className="relative min-w-[200px] flex-1">
            <span className="absolute left-[12px] top-1/2 inline-flex -translate-y-1/2 text-[#94a3b8]"><Icon name="pill" size={16} /></span>
            <input value={drugQuery} onChange={(event) => setDrugQuery(event.target.value)} placeholder="กรองด้วยชื่อยา" className="w-full rounded-[11px] border border-[#cbd5e1] py-[10px] pl-[36px] pr-[12px] text-[13.5px] text-[#0f172a] outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,.12)]" />
          </div>
          <label className="flex items-center gap-[7px] rounded-[11px] border border-[#cbd5e1] px-[12px] py-[8px]">
            <span className="text-[12px] text-[#94a3b8]">จาก</span>
            <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} className="bg-transparent text-[13px] text-[#0f172a] outline-none" />
          </label>
          <label className="flex items-center gap-[7px] rounded-[11px] border border-[#cbd5e1] px-[12px] py-[8px]">
            <span className="text-[12px] text-[#94a3b8]">ถึง</span>
            <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} className="bg-transparent text-[13px] text-[#0f172a] outline-none" />
          </label>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="inline-flex cursor-pointer items-center gap-[6px] rounded-[11px] border border-[#fecdd3] bg-[#fff1f2] px-[13px] py-[9px] text-[13px] font-semibold text-[#be123c] hover:bg-[#ffe4e6]"><Icon name="x" size={15} />ล้างตัวกรอง</button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[18px] border border-[#e7eef7] bg-white px-[24px] py-[56px] text-center">
          <div className="mb-[16px] inline-flex h-[66px] w-[66px] items-center justify-center rounded-full bg-[#eff6ff] text-[#93c5fd]"><Icon name="search" size={30} /></div>
          <h3 className="mb-[6px] text-[16px] font-bold text-[#334155]">ไม่พบใบค้างรับยาที่ตรงกับเงื่อนไข</h3>
          <p className="mb-[18px] text-[13.5px] text-[#94a3b8]">ลองปรับคำค้นหาหรือตัวกรองสถานะใหม่อีกครั้ง</p>
          <button onClick={clearFilters} className="cursor-pointer rounded-[11px] border border-[#bfdbfe] bg-[#eff6ff] px-[20px] py-[10px] text-[13.5px] font-bold text-[#1d4ed8] hover:bg-[#dbeafe]">ล้างตัวกรองทั้งหมด</button>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-[18px] border border-[#e7eef7] bg-white">
            <TicketRows tickets={visible} mode="list" onView={onView} onEdit={onEdit} onDelete={onDelete} onPrint={onPrint} canDelete={canDelete} />
          </div>
          {totalPages > 1 && (
            <div className="mt-[16px] flex items-center justify-center gap-[10px]">
              <button onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} className="inline-flex cursor-pointer items-center gap-[6px] rounded-[11px] border border-[#e2e8f0] bg-white px-[14px] py-[9px] text-[13px] font-semibold text-[#475569] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50">ก่อนหน้า</button>
              <span className="text-[13px] font-semibold text-[#475569]">หน้า {currentPage} / {totalPages}</span>
              <button onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPages} className="inline-flex cursor-pointer items-center gap-[6px] rounded-[11px] border border-[#e2e8f0] bg-white px-[14px] py-[9px] text-[13px] font-semibold text-[#475569] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50">ถัดไป</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
