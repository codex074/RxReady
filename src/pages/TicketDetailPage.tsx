import type { Ticket, TicketAuditLog, TicketStatus } from '../types/backorder';
import { formatRelative, formatThaiDate } from '../utils/format';
import { PUBLIC_TIMELINE_ORDER, STAFF_STATUS_ORDER, STATUSES } from '../utils/status';
import { Icon } from '../components/Icon';
import { StatusBadge } from '../components/StatusBadge';

type TicketDetailPageProps = {
  ticket: Ticket;
  loading: boolean;
  auditLoading: boolean;
  auditLogs: TicketAuditLog[];
  canDelete: boolean;
  onBack: () => void;
  onPrint: () => void;
  onDelete: () => void;
  onStatusChange: (status: TicketStatus) => void;
};

export function TicketDetailPage({
  ticket,
  loading,
  auditLoading,
  auditLogs,
  canDelete,
  onBack,
  onPrint,
  onDelete,
  onStatusChange,
}: TicketDetailPageProps) {
  const statusMeta = STATUSES[ticket.status];

  return (
    <div className="animate-fade-up">
      <button onClick={onBack} className="mb-[14px] inline-flex cursor-pointer items-center gap-[6px] border-0 bg-transparent p-0 text-[13.5px] font-semibold text-[#64748b] hover:text-[#2563eb]">← กลับไปรายการใบค้างยา</button>

      <div className="mb-[20px] flex flex-wrap items-start justify-between gap-[14px]">
        <div>
          <div className="mb-[4px] text-[12.5px] text-[#94a3b8]">เลขที่ใบค้างยา</div>
          <div className="flex flex-wrap items-center gap-[12px]">
            <h1 className="text-[clamp(22px,3.4vw,30px)] font-bold tabular-nums text-[#0f172a]">{ticket.no}</h1>
            <StatusBadge status={ticket.status} large />
          </div>
          <div className="mt-[6px] text-[13px] text-[#94a3b8]">สร้างเมื่อ {formatThaiDate(ticket.createdAt)} · อัปเดต {formatRelative(ticket.updatedAt)}</div>
        </div>
        <div className="flex flex-wrap gap-[9px]">
          {canDelete && <button disabled={loading} onClick={onDelete} className="inline-flex cursor-pointer items-center gap-[8px] rounded-[12px] border border-[#fecdd3] bg-white px-[16px] py-[11px] text-[14px] font-bold text-[#be123c] hover:bg-[#fff1f2] disabled:cursor-not-allowed disabled:opacity-60"><Icon name="trash" size={17} />ลบใบค้างยา</button>}
          <button onClick={onPrint} className="inline-flex cursor-pointer items-center gap-[8px] rounded-[12px] border-0 bg-[#2563eb] px-[18px] py-[11px] text-[14px] font-bold text-white hover:bg-[#1d4ed8]"><Icon name="printer" size={18} />พิมพ์ QR / สลิป</button>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-[16px]">
        <div className="flex min-w-0 flex-[2_1_360px] flex-col gap-[16px]">
          <div className="rounded-[18px] border border-[#e7eef7] bg-white p-[22px]">
            <h2 className="mb-[16px] text-[15.5px] font-bold text-[#0f172a]">ข้อมูลผู้ป่วย</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-[16px] gap-y-[18px]">
              <Info label="HN" value={ticket.hn} tabular />
              <Info label="ชื่อ-สกุล" value={ticket.name} />
              <Info label="เบอร์โทรศัพท์" value={ticket.phone} tabular />
              <div className="col-span-full"><div className="mb-[3px] text-[12px] text-[#94a3b8]">หมายเหตุ</div><div className="text-[14px] text-[#475569]">{ticket.note || '-'}</div></div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[18px] border border-[#e7eef7] bg-white">
            <div className="flex items-center justify-between gap-[10px] px-[22px] pb-[16px] pt-[18px]">
              <h2 className="text-[15.5px] font-bold text-[#0f172a]">รายการยาที่ค้าง</h2>
              <span className="rounded-full border border-[#dbeafe] bg-[#eff6ff] px-[10px] py-[3px] text-[12.5px] font-semibold text-[#1d4ed8]">{ticket.items.length} รายการ</span>
            </div>
            <div className="hidden min-[900px]:block">
              <table className="w-full border-collapse">
                <thead><tr>
                  <th className="px-[22px] py-[10px] text-left text-[12px] font-semibold text-[#94a3b8]">ชื่อยา</th>
                  <th className="px-[10px] py-[10px] text-center text-[12px] font-semibold text-[#94a3b8]">จำนวนค้าง</th>
                  <th className="px-[10px] py-[10px] text-left text-[12px] font-semibold text-[#94a3b8]">หน่วย</th>
                  <th className="px-[14px] py-[10px] text-left text-[12px] font-semibold text-[#94a3b8]">สถานะ</th>
                  <th className="px-[22px] py-[10px] text-left text-[12px] font-semibold text-[#94a3b8]">หมายเหตุ</th>
                </tr></thead>
                <tbody>{ticket.items.map((item) => (
                  <tr key={item.id} className="border-t border-[#f1f5f9]">
                    <td className="px-[22px] py-[13px] text-[14px] font-semibold text-[#0f172a]">{item.name}</td>
                    <td className="px-[10px] py-[13px] text-center text-[14px] font-semibold tabular-nums text-[#334155]">{item.qty}</td>
                    <td className="px-[10px] py-[13px] text-[13.5px] text-[#64748b]">{item.unit}</td>
                    <td className="px-[14px] py-[13px]"><StatusBadge status={item.status} compact /></td>
                    <td className="px-[22px] py-[13px] text-[13px] text-[#94a3b8]">{item.note || '-'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="flex flex-col min-[900px]:hidden">
              {ticket.items.map((item) => (
                <div key={item.id} className="border-t border-[#f1f5f9] px-[18px] py-[14px]">
                  <div className="mb-[6px] flex justify-between gap-[10px]"><span className="text-[14px] font-semibold text-[#0f172a]">{item.name}</span><StatusBadge status={item.status} compact /></div>
                  <div className="text-[13px] text-[#64748b]">ค้าง {item.qty} {item.unit} · {item.note || '-'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-[1_1_270px] flex-col gap-[16px]">
          <div className="rounded-[18px] border border-[#e7eef7] bg-white p-[22px]">
            <h2 className="mb-[18px] text-[15.5px] font-bold text-[#0f172a]">ความคืบหน้า</h2>
            {ticket.status === 'cancelled' && <div className="flex items-center gap-[9px] rounded-[12px] border border-[#fecdd3] bg-[#fff1f2] px-[14px] py-[12px] text-[13.5px] font-semibold text-[#be123c]"><span className="h-[9px] w-[9px] rounded-full bg-[#f43f5e]" />ใบค้างยานี้ถูกยกเลิกแล้ว</div>}
            <div className="flex flex-col">
              {PUBLIC_TIMELINE_ORDER.map((status, index) => {
                const meta = STATUSES[status];
                const done = ticket.status !== 'cancelled' && statusMeta.step >= meta.step;
                return (
                  <div key={status} className="flex gap-[13px]">
                    <div className="flex flex-col items-center">
                      <span className="mt-[2px] h-[13px] w-[13px] shrink-0 rounded-full" style={{ background: done ? meta.dot : '#cbd5e1' }} />
                      {index < PUBLIC_TIMELINE_ORDER.length - 1 && <span className="my-[3px] min-h-[20px] w-[2px] flex-1 bg-[#e8eef6]" />}
                    </div>
                    <div className="pb-[6px]"><div className="text-[14px] font-semibold" style={{ color: done ? '#0f172a' : '#94a3b8' }}>{meta.label}</div></div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[18px] border border-[#e7eef7] bg-white p-[22px]">
            <h2 className="mb-[3px] text-[15.5px] font-bold text-[#0f172a]">เปลี่ยนสถานะ</h2>
            <p className="mb-[16px] text-[12.5px] text-[#94a3b8]">อัปเดตสถานะการจัดยาของใบค้างนี้</p>
            <div className="flex flex-col gap-[8px]">
              {STAFF_STATUS_ORDER.map((status) => {
                const meta = STATUSES[status];
                const active = ticket.status === status;
                return (
                  <button key={status} disabled={loading} onClick={() => onStatusChange(status)} className="flex w-full cursor-pointer items-center gap-[10px] rounded-[12px] px-[14px] py-[12px] text-left text-[14px] transition" style={{ background: active ? meta.bg : '#fff', color: active ? meta.text : '#475569', border: `${active ? 1.5 : 1}px solid ${active ? meta.dot : '#e2e8f0'}`, fontWeight: active ? 700 : 600 }}>
                    <span className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: meta.dot }} />{meta.label}
                    {active && <span className="ml-auto rounded-full border border-current px-[9px] py-[2px] text-[10.5px] font-bold">ปัจจุบัน</span>}
                  </button>
                );
              })}
            </div>
            <div className="my-[14px] h-px bg-[#eef2f7]" />
            <button disabled={loading} onClick={() => onStatusChange('cancelled')} className="flex w-full cursor-pointer items-center gap-[10px] rounded-[12px] border border-[#fecdd3] bg-white px-[14px] py-[12px] text-left text-[14px] font-semibold text-[#be123c] transition hover:bg-[#fff1f2]">
              <span className="h-[9px] w-[9px] shrink-0 rounded-full bg-[#f43f5e]" />ยกเลิกใบค้างยา
              {ticket.status === 'cancelled' && <span className="ml-auto rounded-full border border-current px-[9px] py-[2px] text-[10.5px] font-bold">ปัจจุบัน</span>}
            </button>
          </div>

          <div className="rounded-[18px] border border-[#e7eef7] bg-white p-[22px]">
            <h2 className="mb-[3px] text-[15.5px] font-bold text-[#0f172a]">ประวัติการทำรายการ</h2>
            <p className="mb-[16px] text-[12.5px] text-[#94a3b8]">เก็บย้อนหลัง 3 เดือน</p>
            {auditLoading ? (
              <div className="text-[13px] text-[#94a3b8]">กำลังโหลดประวัติ...</div>
            ) : auditLogs.length === 0 ? (
              <div className="text-[13px] text-[#94a3b8]">ยังไม่มีประวัติการทำรายการ</div>
            ) : (
              <div className="flex flex-col">
                {auditLogs.map((log, index) => (
                  <div key={log.id} className="flex gap-[11px]">
                    <div className="flex flex-col items-center">
                      <span className="mt-[4px] h-[9px] w-[9px] shrink-0 rounded-full bg-[#2563eb]" />
                      {index < auditLogs.length - 1 && <span className="my-[3px] min-h-[24px] w-px flex-1 bg-[#e2e8f0]" />}
                    </div>
                    <div className="pb-[14px]">
                      <div className="text-[13.5px] font-semibold text-[#334155]">{auditActionText(log)}</div>
                      <div className="mt-[2px] text-[12px] text-[#64748b]">โดย {log.actorName}</div>
                      <div className="mt-[1px] text-[11.5px] text-[#94a3b8]">{formatThaiDate(log.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type InfoProps = {
  label: string;
  value: string;
  tabular?: boolean;
};

function Info({ label, value, tabular }: InfoProps) {
  return <div><div className="mb-[3px] text-[12px] text-[#94a3b8]">{label}</div><div className={`text-[14.5px] font-semibold text-[#0f172a] ${tabular ? 'tabular-nums' : ''}`}>{value}</div></div>;
}

function auditActionText(log: TicketAuditLog): string {
  if (log.action === 'create_ticket') return 'ออกใบค้างยา';
  if (log.action === 'update_status' && log.newStatus) {
    const status = STATUSES[log.newStatus].label;
    const reason = typeof log.detail.reason === 'string' ? log.detail.reason.trim() : '';
    return reason ? `เปลี่ยนสถานะเป็น “${status}” · ${reason}` : `เปลี่ยนสถานะเป็น “${status}”`;
  }
  return 'ทำรายการกับใบค้างยา';
}
