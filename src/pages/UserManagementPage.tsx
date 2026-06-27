import { useState } from 'react';
import { Icon } from '../components/Icon';
import type { StaffRole } from '../types/backorder';
import type {
  CreateManagedUserInput,
  ManagedUser,
  UpdateManagedUserInput,
} from '../types/user';

const roleLabels: Record<StaffRole, string> = {
  admin: 'ผู้ดูแลระบบ',
  pharmacist: 'เภสัชกรห้องยา',
  staff: 'เจ้าหน้าที่ห้องยา',
  viewer: 'ผู้ดูข้อมูล',
};

const roleColors: Record<StaffRole, string> = {
  admin: 'bg-[#fef3c7] text-[#92400e]',
  pharmacist: 'bg-[#ede9fe] text-[#5b21b6]',
  staff: 'bg-[#dbeafe] text-[#1d4ed8]',
  viewer: 'bg-[#f1f5f9] text-[#475569]',
};

type FilterStatus = 'all' | 'active' | 'inactive';

type UserManagementPageProps = {
  users: ManagedUser[];
  loading: boolean;
  currentUserId?: string;
  onRefresh: () => Promise<void>;
  onCreate: (input: CreateManagedUserInput) => Promise<boolean>;
  onUpdate: (input: UpdateManagedUserInput) => Promise<boolean>;
  onToggleActive: (user: ManagedUser) => void;
  onResetPassword: (user: ManagedUser) => void;
};

type UserForm = {
  username: string;
  displayName: string;
  password: string;
  role: StaffRole;
  isActive: boolean;
};

const blankForm: UserForm = {
  username: '',
  displayName: '',
  password: '',
  role: 'staff',
  isActive: true,
};

export function UserManagementPage({
  users,
  loading,
  currentUserId,
  onRefresh,
  onCreate,
  onUpdate,
  onToggleActive,
  onResetPassword,
}: UserManagementPageProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(blankForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  const filteredUsers = users.filter((u) => {
    if (statusFilter === 'active' && !u.isActive) return false;
    if (statusFilter === 'inactive' && u.isActive) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q);
  });

  const activeCount = users.filter((u) => u.isActive).length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  function openCreate() {
    setEditingId(null);
    setForm(blankForm);
    setFormOpen(true);
  }

  function openEdit(user: ManagedUser) {
    setEditingId(user.id);
    setForm({
      username: user.username,
      displayName: user.displayName,
      password: '',
      role: user.role,
      isActive: user.isActive,
    });
    setFormOpen(true);
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const success = editingId
      ? await onUpdate({
          userId: editingId,
          displayName: form.displayName,
          role: form.role,
          isActive: form.isActive,
        })
      : await onCreate({
          username: form.username,
          displayName: form.displayName,
          password: form.password,
          role: form.role,
        });
    if (success) {
      setFormOpen(false);
      setEditingId(null);
      setForm(blankForm);
    }
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-[18px] flex flex-wrap items-start justify-between gap-[14px]">
        <div>
          <h1 className="mb-[5px] text-[24px] font-bold text-[#0f172a]">จัดการผู้ใช้</h1>
          <p className="text-[13.5px] text-[#64748b]">เพิ่มเจ้าหน้าที่ กำหนดสิทธิ์ และควบคุมการเข้าใช้งานระบบ</p>
        </div>
        <div className="flex gap-[9px]">
          <button type="button" onClick={() => void onRefresh()} disabled={loading} className="inline-flex cursor-pointer items-center gap-[8px] rounded-[11px] border border-[#dbe5f1] bg-white px-[14px] py-[10px] text-[13.5px] font-semibold text-[#475569] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60">
            <Icon name="refresh" size={16} />
            รีเฟรช
          </button>
          <button type="button" onClick={openCreate} className="inline-flex cursor-pointer items-center gap-[8px] rounded-[11px] border-0 bg-[#2563eb] px-[16px] py-[10px] text-[13.5px] font-bold text-white hover:bg-[#1d4ed8]">
            <Icon name="plus" size={17} />
            เพิ่มผู้ใช้
          </button>
        </div>
      </div>

      <div className="mb-[18px] grid grid-cols-3 gap-[10px]">
        <StatCard label="ผู้ใช้ทั้งหมด" value={users.length} />
        <StatCard label="ใช้งานอยู่" value={activeCount} color="green" />
        <StatCard label="ผู้ดูแลระบบ" value={adminCount} color="amber" />
      </div>

      {formOpen && (
        <form onSubmit={(event) => void submitForm(event)} className="mb-[20px] rounded-[18px] border border-[#dbe5f1] bg-white p-[clamp(18px,2.5vw,24px)] shadow-[0_12px_30px_-24px_rgba(15,42,90,.5)]">
          <div className="mb-[18px] flex items-center justify-between gap-[12px]">
            <h2 className="text-[17px] font-bold text-[#0f172a]">{editingId ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}</h2>
            <button type="button" onClick={() => setFormOpen(false)} className="cursor-pointer border-0 bg-transparent text-[13px] font-semibold text-[#64748b]">ยกเลิก</button>
          </div>
          <div className="grid gap-[16px] min-[700px]:grid-cols-2">
            <Field label="ชื่อผู้ใช้">
              <input type="text" autoComplete="off" disabled={Boolean(editingId)} required value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} placeholder="เช่น pharmacist01" className="w-full rounded-[11px] border border-[#cbd5e1] px-[13px] py-[11px] text-[14px] outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,.12)] disabled:bg-[#f8fafc] disabled:text-[#94a3b8]" />
            </Field>
            <Field label="ชื่อที่แสดง">
              <input type="text" required value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} placeholder="ชื่อเจ้าหน้าที่" className="w-full rounded-[11px] border border-[#cbd5e1] px-[13px] py-[11px] text-[14px] outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,.12)]" />
            </Field>
            {!editingId && (
              <Field label="รหัสผ่าน/PIN">
                <input type="password" autoComplete="new-password" required minLength={4} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="อย่างน้อย 4 ตัว" className="w-full rounded-[11px] border border-[#cbd5e1] px-[13px] py-[11px] text-[14px] outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,.12)]" />
              </Field>
            )}
            <Field label="สิทธิ์การใช้งาน">
              <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as StaffRole }))} className="w-full rounded-[11px] border border-[#cbd5e1] bg-white px-[13px] py-[11px] text-[14px] outline-none focus:border-[#2563eb]">
                {Object.entries(roleLabels).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-[20px] flex justify-end">
            <button type="submit" disabled={loading} className="cursor-pointer rounded-[11px] border-0 bg-[#2563eb] px-[20px] py-[11px] text-[13.5px] font-bold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'สร้างผู้ใช้'}
            </button>
          </div>
        </form>
      )}

      <div className="mb-[14px] flex flex-wrap items-center gap-[10px]">
        <div className="relative flex-1" style={{ minWidth: '200px' }}>
          <Icon name="search" size={15} className="absolute left-[13px] top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาชื่อผู้ใช้หรือชื่อที่แสดง..."
            className="w-full rounded-[11px] border border-[#dbe5f1] bg-white py-[10px] pl-[37px] pr-[13px] text-[13.5px] outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,.12)]"
          />
        </div>
        <div className="flex rounded-[11px] border border-[#dbe5f1] bg-white text-[12.5px] font-semibold overflow-hidden">
          {(['all', 'active', 'inactive'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-[13px] py-[10px] cursor-pointer border-0 ${statusFilter === status ? 'bg-[#2563eb] text-white' : 'text-[#64748b] hover:bg-[#f8fafc]'}`}
            >
              {status === 'all' ? 'ทั้งหมด' : status === 'active' ? 'ใช้งาน' : 'ปิดใช้งาน'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[18px] border border-[#e2e8f0] bg-white">
        <div className="hidden overflow-x-auto min-[760px]:block">
          <table className="w-full border-collapse text-left">
            <thead className="bg-[#f8fafc] text-[12px] font-bold text-[#64748b]">
              <tr>
                <th className="px-[18px] py-[13px]">ผู้ใช้</th>
                <th className="px-[14px] py-[13px]">สิทธิ์</th>
                <th className="px-[14px] py-[13px]">สถานะ</th>
                <th className="px-[14px] py-[13px]">วันที่สร้าง</th>
                <th className="px-[18px] py-[13px] text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((managedUser) => (
                <tr key={managedUser.id} className={`border-t border-[#eef2f7] text-[13.5px] ${!managedUser.isActive ? 'opacity-60' : ''}`}>
                  <td className="px-[18px] py-[15px]">
                    <div className="font-bold text-[#0f172a]">{managedUser.displayName}{managedUser.id === currentUserId ? ' (คุณ)' : ''}</div>
                    <div className="mt-[2px] text-[12px] text-[#94a3b8]">@{managedUser.username}</div>
                  </td>
                  <td className="px-[14px] py-[15px]">
                    <span className={`inline-flex rounded-full px-[9px] py-[4px] text-[11.5px] font-bold ${roleColors[managedUser.role]}`}>
                      {roleLabels[managedUser.role]}
                    </span>
                  </td>
                  <td className="px-[14px] py-[15px]"><ActiveBadge active={managedUser.isActive} /></td>
                  <td className="px-[14px] py-[15px] text-[#64748b]">{new Date(managedUser.createdAt).toLocaleDateString('th-TH')}</td>
                  <td className="px-[18px] py-[15px]">
                    <div className="flex justify-end gap-[7px]">
                      <ActionButton label="แก้ไข" onClick={() => openEdit(managedUser)} />
                      <ActionButton label="ตั้งรหัสใหม่" onClick={() => onResetPassword(managedUser)} />
                      {managedUser.id !== currentUserId && (
                        <ActionButton
                          label={managedUser.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                          onClick={() => onToggleActive(managedUser)}
                          variant={managedUser.isActive ? 'danger' : 'success'}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-[#eef2f7] min-[760px]:hidden">
          {filteredUsers.map((managedUser) => (
            <div key={managedUser.id} className={`p-[16px] ${!managedUser.isActive ? 'opacity-60' : ''}`}>
              <div className="mb-[10px] flex items-start justify-between gap-[10px]">
                <div>
                  <div className="font-bold text-[#0f172a]">{managedUser.displayName}{managedUser.id === currentUserId ? ' (คุณ)' : ''}</div>
                  <div className="text-[12px] text-[#94a3b8]">@{managedUser.username}</div>
                </div>
                <ActiveBadge active={managedUser.isActive} />
              </div>
              <div className="mb-[12px]">
                <span className={`inline-flex rounded-full px-[9px] py-[4px] text-[11.5px] font-bold ${roleColors[managedUser.role]}`}>
                  {roleLabels[managedUser.role]}
                </span>
              </div>
              <div className="flex flex-wrap gap-[7px]">
                <ActionButton label="แก้ไข" onClick={() => openEdit(managedUser)} />
                <ActionButton label="ตั้งรหัสใหม่" onClick={() => onResetPassword(managedUser)} />
                {managedUser.id !== currentUserId && (
                  <ActionButton
                    label={managedUser.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                    onClick={() => onToggleActive(managedUser)}
                    variant={managedUser.isActive ? 'danger' : 'success'}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {!loading && filteredUsers.length === 0 && users.length > 0 && (
          <div className="px-[20px] py-[48px] text-center text-[13.5px] text-[#94a3b8]">ไม่พบผู้ใช้ที่ตรงกับเงื่อนไขที่เลือก</div>
        )}
        {!loading && users.length === 0 && (
          <div className="px-[20px] py-[48px] text-center text-[13.5px] text-[#94a3b8]">ยังไม่มีข้อมูลผู้ใช้</div>
        )}
        {loading && users.length === 0 && (
          <div className="px-[20px] py-[48px] text-center text-[13.5px] text-[#64748b]">กำลังโหลดข้อมูลผู้ใช้...</div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: 'green' | 'amber' }) {
  const bg = color === 'green' ? 'bg-[#f0fdf4]' : color === 'amber' ? 'bg-[#fffbeb]' : 'bg-white';
  const text = color === 'green' ? 'text-[#15803d]' : color === 'amber' ? 'text-[#92400e]' : 'text-[#0f172a]';
  return (
    <div className={`rounded-[14px] border border-[#e2e8f0] ${bg} px-[16px] py-[14px]`}>
      <div className={`text-[22px] font-bold ${text}`}>{value}</div>
      <div className="mt-[2px] text-[12px] text-[#64748b]">{label}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-[7px] block text-[13px] font-semibold text-[#334155]">{label}</span>
      {children}
    </label>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-[9px] py-[4px] text-[11.5px] font-bold ${active ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#f1f5f9] text-[#64748b]'}`}>
      {active ? 'ใช้งาน' : 'ปิดใช้งาน'}
    </span>
  );
}

function ActionButton({
  label,
  onClick,
  variant = 'default',
}: {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success';
}) {
  const colors = {
    default: 'text-[#2563eb] hover:bg-[#eff6ff] border-[#dbe5f1]',
    danger: 'text-[#dc2626] hover:bg-[#fff1f2] border-[#fecaca]',
    success: 'text-[#16a34a] hover:bg-[#f0fdf4] border-[#bbf7d0]',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-[9px] border bg-white px-[10px] py-[7px] text-[12px] font-semibold ${colors[variant]}`}
    >
      {label}
    </button>
  );
}
