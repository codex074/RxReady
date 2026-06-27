import type { Ticket } from '../types/backorder';
import { formatRelative, formatThaiDate } from '../utils/format';
import { StatusBadge } from './StatusBadge';

type TicketRowsProps = {
  tickets: Ticket[];
  mode: 'recent' | 'list';
  onView: (ticketId: string) => void;
  onPrint: (ticketId: string) => void;
};

export function TicketRows({ tickets, mode, onView, onPrint }: TicketRowsProps) {
  if (mode === 'recent') {
    return (
      <>
        <div className="hidden min-[900px]:block">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['เลขใบค้าง / HN', 'ผู้ป่วย', 'รายการ', 'สถานะ', 'อัปเดต', 'จัดการ'].map((label, index) => (
                  <th key={label} className={`px-[14px] py-[12px] text-left text-[12px] font-semibold text-[#94a3b8] ${index === 0 ? 'pl-[20px]' : ''} ${index === 5 ? 'pr-[20px] text-right' : ''}`}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="border-t border-[#f1f5f9]">
                  <td className="py-[13px] pl-[20px]"><div className="text-[13.5px] font-bold tabular-nums text-[#0f172a]">{ticket.no}</div><div className="text-[12px] text-[#94a3b8]">HN {ticket.hn}</div></td>
                  <td className="px-[14px] py-[13px] text-[14px] text-[#334155]">{ticket.name}</td>
                  <td className="px-[14px] py-[13px] text-[13.5px] text-[#64748b]">{ticket.items.length} รายการ</td>
                  <td className="px-[14px] py-[13px]"><StatusBadge status={ticket.status} /></td>
                  <td className="px-[14px] py-[13px] text-[12.5px] text-[#94a3b8]">{formatRelative(ticket.updatedAt)}</td>
                  <td className="whitespace-nowrap py-[13px] pr-[20px] text-right">
                    <button onClick={() => onView(ticket.id)} className="mr-[6px] cursor-pointer rounded-[9px] border border-[#dbeafe] bg-[#eff6ff] px-[11px] py-[6px] text-[12.5px] font-semibold text-[#1d4ed8] hover:bg-[#dbeafe]">ดู</button>
                    <button onClick={() => onPrint(ticket.id)} className="cursor-pointer rounded-[9px] border border-[#e2e8f0] bg-white px-[11px] py-[6px] text-[12.5px] font-semibold text-[#475569] hover:bg-[#f8fafc]">พิมพ์ QR</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <MobileTicketCards tickets={tickets} mode={mode} onView={onView} onPrint={onPrint} />
      </>
    );
  }

  return (
    <>
      <div className="hidden min-[900px]:block">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['เลขใบค้าง', 'HN', 'ชื่อผู้ป่วย', 'รายการ', 'สถานะ', 'วันที่สร้าง', 'จัดการ'].map((label, index) => (
                <th key={label} className={`px-[14px] py-[13px] text-left text-[12px] font-semibold text-[#94a3b8] ${index === 0 ? 'pl-[20px]' : ''} ${index === 6 ? 'pr-[20px] text-right' : ''}`}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="border-t border-[#f1f5f9]">
                <td className="py-[13px] pl-[20px] text-[13.5px] font-bold tabular-nums text-[#0f172a]">{ticket.no}</td>
                <td className="px-[14px] py-[13px] text-[13px] tabular-nums text-[#64748b]">{ticket.hn}</td>
                <td className="px-[14px] py-[13px] text-[14px] text-[#334155]">{ticket.name}</td>
                <td className="px-[14px] py-[13px] text-[13.5px] text-[#64748b]">{ticket.items.length} รายการ</td>
                <td className="px-[14px] py-[13px]"><StatusBadge status={ticket.status} /></td>
                <td className="px-[14px] py-[13px] text-[12.5px] text-[#94a3b8]">{formatThaiDate(ticket.createdAt)}</td>
                <td className="whitespace-nowrap py-[13px] pr-[20px] text-right">
                  <button onClick={() => onView(ticket.id)} className="mr-[6px] cursor-pointer rounded-[9px] border border-[#dbeafe] bg-[#eff6ff] px-[11px] py-[6px] text-[12.5px] font-semibold text-[#1d4ed8] hover:bg-[#dbeafe]">ดู</button>
                  <button onClick={() => onPrint(ticket.id)} className="cursor-pointer rounded-[9px] border border-[#e2e8f0] bg-white px-[11px] py-[6px] text-[12.5px] font-semibold text-[#475569] hover:bg-[#f8fafc]">พิมพ์ QR</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <MobileTicketCards tickets={tickets} mode={mode} onView={onView} onPrint={onPrint} />
    </>
  );
}

function MobileTicketCards({ tickets, mode, onView, onPrint }: TicketRowsProps) {
  return (
    <div className="flex flex-col min-[900px]:hidden">
      {tickets.map((ticket) => (
        <div key={ticket.id} className="border-t border-[#f1f5f9] px-[18px] py-[15px]">
          <div className="mb-[8px] flex items-start justify-between gap-[10px]">
            <div><div className="text-[14px] font-bold text-[#0f172a]">{ticket.no}</div><div className="text-[12.5px] text-[#64748b]">{ticket.name} · HN {ticket.hn}</div></div>
            <StatusBadge status={ticket.status} />
          </div>
          <div className="flex items-center justify-between gap-[10px]">
            <span className="text-[12px] text-[#94a3b8]">{ticket.items.length} รายการ · {mode === 'recent' ? formatRelative(ticket.updatedAt) : formatThaiDate(ticket.createdAt)}</span>
            <div className="flex gap-[6px]">
              <button onClick={() => onView(ticket.id)} className="rounded-[9px] border border-[#dbeafe] bg-[#eff6ff] px-[12px] py-[6px] text-[12.5px] font-semibold text-[#1d4ed8]">ดู</button>
              <button onClick={() => onPrint(ticket.id)} className="rounded-[9px] border border-[#e2e8f0] bg-white px-[12px] py-[6px] text-[12.5px] font-semibold text-[#475569]">พิมพ์</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
