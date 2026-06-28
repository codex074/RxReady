import { useMemo, useState } from 'react';
import type { Ticket, TicketStatus } from '../types/backorder';
import { STATUSES } from '../utils/status';
import { todayThai } from '../utils/format';
import { Icon } from '../components/Icon';

type OutstandingDrugsPageProps = {
  tickets: Ticket[];
  onView: (ticketId: string) => void;
};

type PatientLine = {
  ticketId: string;
  ticketNo: string;
  patientName: string;
  qty: number;
  status: TicketStatus;
  createdAt: number;
};

type DrugSummary = {
  key: string;
  name: string;
  unit: string;
  totalQty: number;
  preparingQty: number;
  readyQty: number;
  ticketCount: number;
  patientCount: number;
  lines: PatientLine[];
};

// ยังค้างคนไข้ = ยังไม่ได้รับยา และไม่ถูกยกเลิก (กำลังเตรียม + พร้อมรับ)
const OUTSTANDING_STATUSES: TicketStatus[] = ['preparing', 'ready'];

function buildSummary(tickets: Ticket[]): DrugSummary[] {
  const groups = new Map<string, DrugSummary>();

  for (const ticket of tickets) {
    if (!OUTSTANDING_STATUSES.includes(ticket.status)) continue;

    for (const item of ticket.items) {
      const name = item.name.trim();
      if (!name) continue;
      const unit = item.unit.trim();
      const qty = Number(item.qty) || 0;
      const key = `${name}|${unit}`;

      let group = groups.get(key);
      if (!group) {
        group = {
          key,
          name,
          unit,
          totalQty: 0,
          preparingQty: 0,
          readyQty: 0,
          ticketCount: 0,
          patientCount: 0,
          lines: [],
        };
        groups.set(key, group);
      }

      group.totalQty += qty;
      if (ticket.status === 'ready') group.readyQty += qty;
      else group.preparingQty += qty;
      group.ticketCount += 1;
      group.lines.push({
        ticketId: ticket.id,
        ticketNo: ticket.no,
        patientName: ticket.name || '-',
        qty,
        status: ticket.status,
        createdAt: ticket.createdAt,
      });
    }
  }

  for (const group of groups.values()) {
    // เรียงผู้ป่วยที่มาก่อน (ออกใบค้างก่อน) ไว้ด้านบน
    group.lines.sort((a, b) => a.createdAt - b.createdAt);
    group.patientCount = new Set(group.lines.map((line) => line.ticketId)).size;
  }

  return [...groups.values()].sort(
    (a, b) => b.totalQty - a.totalQty || a.name.localeCompare(b.name, 'th'),
  );
}

export function OutstandingDrugsPage({ tickets, onView }: OutstandingDrugsPageProps) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const summary = useMemo(() => buildSummary(tickets), [tickets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return summary;
    return summary.filter((drug) => drug.name.toLowerCase().includes(q));
  }, [summary, query]);

  const outstandingTickets = tickets.filter((ticket) =>
    OUTSTANDING_STATUSES.includes(ticket.status),
  );
  const totalQty = summary.reduce((sum, drug) => sum + drug.totalQty, 0);
  const patientCount = new Set(outstandingTickets.map((ticket) => ticket.id)).size;

  const cards = [
    { label: 'ชนิดยาที่ค้าง', value: summary.length, suffix: 'รายการ', dot: '#2563eb' },
    { label: 'จำนวนยารวม', value: totalQty, suffix: 'หน่วย', dot: '#9333ea' },
    { label: 'ใบค้างที่รอจ่าย', value: outstandingTickets.length, suffix: 'ใบ', dot: STATUSES.preparing.dot },
    { label: 'คนไข้ที่รอรับ', value: patientCount, suffix: 'คน', dot: STATUSES.ready.dot },
  ];

  return (
    <div className="animate-fade-up">
      <div className="mb-[22px] flex flex-wrap items-end justify-between gap-[14px]">
        <div>
          <h1 className="mb-[4px] text-[clamp(20px,3vw,26px)] font-bold text-[#0f172a]">ยาค้างคนไข้</h1>
          <p className="text-[13.5px] text-[#64748b]">สรุปรายการและจำนวนยาที่ยังค้างจ่าย · {todayThai()}</p>
        </div>
      </div>

      <div className="mb-[26px] grid grid-cols-[repeat(auto-fit,minmax(165px,1fr))] gap-[13px]">
        {cards.map((card) => (
          <div key={card.label} className="flex flex-col gap-[10px] rounded-[16px] border border-[#e7eef7] bg-white px-[18px] py-[16px]">
            <div className="flex items-center gap-[8px]"><span className="h-[9px] w-[9px] rounded-full" style={{ background: card.dot }} /><span className="text-[13px] font-medium text-[#64748b]">{card.label}</span></div>
            <div className="flex items-end gap-[6px]"><span className="text-[30px] font-bold leading-none tabular-nums text-[#0f172a]">{card.value}</span><span className="mb-[3px] text-[12.5px] text-[#94a3b8]">{card.suffix}</span></div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[18px] border border-[#e7eef7] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-[10px] border-b border-[#eef2f7] px-[20px] py-[16px]">
          <h2 className="text-[16px] font-bold text-[#0f172a]">รายการยาที่ค้าง</h2>
          <div className="relative">
            <span className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2 text-[#94a3b8]"><Icon name="search" size={16} /></span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาชื่อยา"
              className="w-[200px] max-w-full rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] py-[9px] pl-[34px] pr-[12px] text-[13.5px] text-[#0f172a] outline-none focus:border-[#bfdbfe]"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-[10px] px-[20px] py-[48px] text-center">
            <span className="inline-flex h-[46px] w-[46px] items-center justify-center rounded-full bg-[#f1f5f9] text-[#94a3b8]"><Icon name="pill" size={22} /></span>
            <p className="text-[14px] font-semibold text-[#334155]">{query ? 'ไม่พบยาที่ค้นหา' : 'ไม่มียาค้างคนไข้'}</p>
            <p className="text-[12.5px] text-[#94a3b8]">{query ? 'ลองค้นหาด้วยชื่ออื่น' : 'ยาทุกรายการถูกจ่ายเรียบร้อยแล้ว'}</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f1f5f9]">
            <div className="hidden grid-cols-[1fr_100px_84px_110px_120px_44px] gap-[12px] px-[20px] py-[11px] text-[12px] font-bold text-[#94a3b8] min-[760px]:grid">
              <span>ชื่อยา</span>
              <span className="text-right">จำนวนรวม</span>
              <span className="text-right">ผู้ป่วย</span>
              <span className="text-right" style={{ color: STATUSES.preparing.text }}>กำลังเตรียม</span>
              <span className="text-right" style={{ color: STATUSES.ready.text }}>พร้อมรับแล้ว</span>
              <span />
            </div>
            {filtered.map((drug) => {
              const isOpen = expanded === drug.key;
              return (
                <div key={drug.key}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : drug.key)}
                    className="grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-x-[12px] gap-y-[6px] border-0 bg-transparent px-[20px] py-[13px] text-left hover:bg-[#f8fafc] min-[760px]:grid-cols-[1fr_100px_84px_110px_120px_44px]"
                  >
                    <div className="min-w-0">
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[14.5px] font-semibold text-[#0f172a]">{drug.name}</div>
                      <div className="text-[12px] text-[#94a3b8]">{drug.ticketCount} ใบค้าง · {drug.patientCount} ราย · หน่วย{drug.unit || '-'}</div>
                    </div>
                    <div className="text-right min-[760px]:order-none order-4 col-span-2 min-[760px]:col-span-1">
                      <span className="text-[18px] font-bold tabular-nums text-[#0f172a]">{drug.totalQty.toLocaleString('th-TH')}</span>
                      <span className="ml-[4px] text-[12.5px] text-[#94a3b8]">{drug.unit}</span>
                    </div>
                    <div className="hidden text-right min-[760px]:block">
                      <span className="text-[16px] font-bold tabular-nums text-[#0f172a]">{drug.patientCount.toLocaleString('th-TH')}</span>
                      <span className="ml-[3px] text-[12px] text-[#94a3b8]">ราย</span>
                    </div>
                    <div className="hidden text-right min-[760px]:block">
                      {drug.preparingQty > 0 ? (
                        <>
                          <span className="text-[16px] font-bold tabular-nums" style={{ color: STATUSES.preparing.text }}>{drug.preparingQty.toLocaleString('th-TH')}</span>
                          <span className="ml-[3px] text-[12px] text-[#94a3b8]">{drug.unit}</span>
                        </>
                      ) : (
                        <span className="text-[15px] text-[#cbd5e1]">–</span>
                      )}
                    </div>
                    <div className="hidden text-right min-[760px]:block">
                      {drug.readyQty > 0 ? (
                        <>
                          <span className="text-[16px] font-bold tabular-nums" style={{ color: STATUSES.ready.text }}>{drug.readyQty.toLocaleString('th-TH')}</span>
                          <span className="ml-[3px] text-[12px] text-[#94a3b8]">{drug.unit}</span>
                        </>
                      ) : (
                        <span className="text-[15px] text-[#cbd5e1]">–</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-[6px] order-2 min-[760px]:hidden">
                      {drug.preparingQty > 0 && (
                        <span className="inline-flex items-center gap-[5px] rounded-full px-[9px] py-[3px] text-[11.5px] font-semibold" style={{ background: STATUSES.preparing.bg, color: STATUSES.preparing.text }}>
                          <span className="h-[6px] w-[6px] rounded-full" style={{ background: STATUSES.preparing.dot }} />{drug.preparingQty} เตรียม
                        </span>
                      )}
                      {drug.readyQty > 0 && (
                        <span className="inline-flex items-center gap-[5px] rounded-full px-[9px] py-[3px] text-[11.5px] font-semibold" style={{ background: STATUSES.ready.bg, color: STATUSES.ready.text }}>
                          <span className="h-[6px] w-[6px] rounded-full" style={{ background: STATUSES.ready.dot }} />{drug.readyQty} พร้อม
                        </span>
                      )}
                    </div>
                    <span className={`hidden justify-self-end text-[#94a3b8] transition-transform min-[760px]:inline-flex ${isOpen ? 'rotate-90' : ''}`}><Icon name="list" size={16} /></span>
                  </button>

                  {isOpen && (
                    <div className="bg-[#f8fafc] px-[20px] py-[12px]">
                      <div className="overflow-hidden rounded-[12px] border border-[#e7eef7] bg-white">
                        {drug.lines.map((line, index) => (
                            <button
                              key={`${line.ticketId}-${index}`}
                              onClick={() => onView(line.ticketId)}
                              className="flex w-full cursor-pointer items-center justify-between gap-[12px] border-0 border-b border-[#f1f5f9] bg-transparent px-[14px] py-[10px] text-left last:border-b-0 hover:bg-[#f8fafc]"
                            >
                              <div className="min-w-0">
                                <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13.5px] font-semibold text-[#0f172a]">{line.patientName}</div>
                                <div className="text-[11.5px] text-[#94a3b8]">{line.ticketNo}</div>
                              </div>
                              <div className="flex shrink-0 items-center gap-[10px]">
                                <span className="inline-flex items-center rounded-full px-[8px] py-[2px] text-[11px] font-semibold" style={{ background: STATUSES[line.status].bg, color: STATUSES[line.status].text }}>{STATUSES[line.status].label}</span>
                                <span className="text-[13.5px] font-bold tabular-nums text-[#0f172a]">{line.qty.toLocaleString('th-TH')} <span className="text-[11.5px] font-normal text-[#94a3b8]">{drug.unit}</span></span>
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
