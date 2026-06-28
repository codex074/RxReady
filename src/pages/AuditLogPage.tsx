import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import type { AuditLogEntry } from '../types/audit';
import { formatThaiDate } from '../utils/format';
import { STATUSES } from '../utils/status';

type AuditFilter = 'all' | 'ticket' | 'drug' | 'user';

type AuditLogPageProps = {
  logs: AuditLogEntry[];
  loading: boolean;
  onRefresh: () => void;
};

export function AuditLogPage({ logs, loading, onRefresh }: AuditLogPageProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AuditFilter>('all');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return logs.filter((log) => {
      if (filter !== 'all' && actionCategory(log.action) !== filter) return false;
      if (!normalized) return true;
      return [
        log.actorName,
        log.ticketNo,
        log.action,
        targetText(log),
      ].some((value) => String(value || '').toLowerCase().includes(normalized));
    });
  }, [filter, logs, query]);

  return (
    <div className="animate-fade-up">
      <div className="mb-[18px] flex flex-wrap items-start justify-between gap-[14px]">
        <div>
          <h1 className="mb-[5px] text-[24px] font-bold text-[#0f172a]">ประวัติการทำรายการ</h1>
          <p className="text-[13.5px] text-[#64748b]">สำหรับ Admin เท่านั้น · เก็บข้อมูลย้อนหลัง 3 เดือน</p>
        </div>
        <button onClick={onRefresh} disabled={loading} className="inline-flex cursor-pointer items-center gap-[8px] rounded-[11px] border border-[#dbe5f1] bg-white px-[14px] py-[10px] text-[13.5px] font-semibold text-[#475569] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60">
          <Icon name="refresh" size={16} />
          รีเฟรช
        </button>
      </div>

      <div className="mb-[16px] flex flex-wrap gap-[10px] rounded-[16px] border border-[#e2e8f0] bg-white p-[14px]">
        <div className="relative min-w-[220px] flex-1">
          <Icon name="search" size={16} className="absolute left-[13px] top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาเลขใบค้าง ชื่อผู้ทำ หรือรายการ..." className="w-full rounded-[11px] border border-[#cbd5e1] py-[10px] pl-[38px] pr-[13px] text-[13.5px] outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,.12)]" />
        </div>
        <select value={filter} onChange={(event) => setFilter(event.target.value as AuditFilter)} className="min-w-[180px] rounded-[11px] border border-[#cbd5e1] bg-white px-[13px] py-[10px] text-[13.5px] text-[#334155] outline-none focus:border-[#2563eb]">
          <option value="all">ทุกการทำรายการ</option>
          <option value="ticket">ใบค้างรับยา</option>
          <option value="drug">ข้อมูลยา</option>
          <option value="user">ผู้ใช้งาน</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-[18px] border border-[#e2e8f0] bg-white">
        {loading ? (
          <div className="px-[22px] py-[36px] text-center text-[13.5px] text-[#94a3b8]">กำลังโหลดประวัติ...</div>
        ) : filtered.length === 0 ? (
          <div className="px-[22px] py-[36px] text-center text-[13.5px] text-[#94a3b8]">ไม่พบประวัติที่ตรงกับเงื่อนไข</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto min-[760px]:block">
              <table className="w-full border-collapse text-left">
                <thead className="bg-[#f8fafc] text-[12px] font-bold text-[#64748b]">
                  <tr>
                    <th className="px-[18px] py-[11px]">วันเวลา</th>
                    <th className="px-[14px] py-[11px]">รายการ</th>
                    <th className="px-[14px] py-[11px]">ข้อมูลที่เกี่ยวข้อง</th>
                    <th className="px-[18px] py-[11px]">ผู้ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => (
                    <tr key={log.id} className="border-t border-[#eef2f7]">
                      <td className="whitespace-nowrap px-[18px] py-[13px] text-[12.5px] text-[#64748b]">{formatThaiDate(log.createdAt)}</td>
                      <td className="px-[14px] py-[13px]"><ActionBadge log={log} /></td>
                      <td className="px-[14px] py-[13px] text-[13px] text-[#475569]">{targetText(log)}</td>
                      <td className="px-[18px] py-[13px] text-[13px] font-semibold text-[#334155]">{log.actorName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-[#eef2f7] min-[760px]:hidden">
              {filtered.map((log) => (
                <div key={log.id} className="px-[16px] py-[14px]">
                  <div className="mb-[7px] flex flex-wrap items-center justify-between gap-[8px]"><ActionBadge log={log} /><span className="text-[11.5px] text-[#94a3b8]">{formatThaiDate(log.createdAt)}</span></div>
                  <div className="text-[13px] text-[#475569]">{targetText(log)}</div>
                  <div className="mt-[4px] text-[12px] text-[#64748b]">โดย {log.actorName}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ActionBadge({ log }: { log: AuditLogEntry }) {
  const category = actionCategory(log.action);
  const color = category === 'drug'
    ? 'bg-[#ecfdf5] text-[#047857]'
    : category === 'user'
      ? 'bg-[#f5f3ff] text-[#6d28d9]'
      : 'bg-[#eff6ff] text-[#1d4ed8]';
  return <span className={`inline-flex rounded-full px-[10px] py-[4px] text-[12px] font-bold ${color}`}>{actionText(log)}</span>;
}

function actionCategory(action: string): Exclude<AuditFilter, 'all'> {
  if (action.includes('drug')) return 'drug';
  if (action.includes('user') || action.includes('profile') || action.includes('password')) return 'user';
  return 'ticket';
}

function actionText(log: AuditLogEntry): string {
  const labels: Record<string, string> = {
    create_ticket: 'ออกใบค้างรับยา',
    update_ticket: 'แก้ไขใบค้างรับยา',
    delete_ticket: 'ลบใบค้างรับยา',
    create_drug: 'เพิ่มข้อมูลยา',
    update_drug: 'แก้ไขข้อมูลยา',
    delete_drug: 'ลบข้อมูลยา',
    admin_create_user: 'เพิ่มผู้ใช้',
    admin_update_user: 'แก้ไขผู้ใช้',
    admin_activate_user: 'เปิดใช้งานผู้ใช้',
    admin_deactivate_user: 'ปิดใช้งานผู้ใช้',
    admin_reset_password: 'ตั้งรหัสผ่านใหม่',
    self_update_profile: 'แก้ไขข้อมูลส่วนตัว',
  };
  if (log.action === 'update_status' && log.newStatus) return `เปลี่ยนเป็น ${STATUSES[log.newStatus].label}`;
  return labels[log.action] || log.action;
}

function targetText(log: AuditLogEntry): string {
  if (log.ticketNo) return `ใบค้างรับยา ${log.ticketNo}`;
  if (typeof log.detail.drugName === 'string') return log.detail.drugName;
  if (typeof log.detail.username === 'string') return `@${log.detail.username}`;
  if (typeof log.detail.name === 'string') return log.detail.name;
  return '—';
}
