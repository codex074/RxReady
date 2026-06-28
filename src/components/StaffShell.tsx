import type { ReactNode } from 'react';
import type { StaffUser } from '../types/backorder';
import type { AppRoute } from '../types/navigation';
import { uscLogo } from '../uiAssets';
import { todayThai } from '../utils/format';
import { Icon } from './Icon';

type StaffShellProps = {
  route: AppRoute;
  user: StaffUser;
  sidebarOpen: boolean;
  children: ReactNode;
  onNavigate: (route: AppRoute) => void;
  onToggleSidebar: () => void;
  onCloseSidebar: () => void;
  onLogout: () => void;
  onEditProfile: () => void;
};

const pageTitles: Partial<Record<AppRoute, string>> = {
  dashboard: 'ภาพรวมระบบ',
  create: 'สร้างใบค้างยา',
  list: 'รายการใบค้างยา',
  outstanding: 'ยาค้างคนไข้',
  detail: 'รายละเอียดใบค้างยา',
  users: 'จัดการผู้ใช้',
  drugs: 'จัดการรายการยา',
};

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  'sub-admin': 'Sub-Admin',
  staff: 'Staff',
};

export function StaffShell({
  route,
  user,
  sidebarOpen,
  children,
  onNavigate,
  onToggleSidebar,
  onCloseSidebar,
  onLogout,
  onEditProfile,
}: StaffShellProps) {
  return (
    <div className="flex min-h-screen items-stretch">
      {sidebarOpen && (
        <button
          aria-label="ปิดเมนู"
          onClick={onCloseSidebar}
          className="fixed inset-0 z-[45] bg-[rgba(15,23,42,.45)] min-[900px]:hidden"
        />
      )}

      <aside
        className={`z-50 flex w-[264px] shrink-0 flex-col border-r border-[#e7eef7] bg-white max-[899px]:fixed max-[899px]:inset-y-0 max-[899px]:left-0 max-[899px]:shadow-[0_0_50px_rgba(15,42,90,.22)] max-[899px]:transition-transform max-[899px]:duration-200 min-[900px]:sticky min-[900px]:top-0 min-[900px]:h-screen ${
          sidebarOpen ? 'max-[899px]:translate-x-0' : 'max-[899px]:-translate-x-[110%]'
        }`}
      >
        <div className="flex items-center gap-[11px] border-b border-[#eef2f7] px-[18px] pb-[16px] pt-[18px]">
          <img src={uscLogo} alt="USC+" className="h-[30px]" />
          <div className="leading-[1.2]">
            <div className="text-[14.5px] font-bold text-[#0f172a]">ระบบใบค้างยา</div>
            <div className="text-[11.5px] text-[#94a3b8]">USC+ · ห้องยา</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-[3px] overflow-y-auto px-[12px] py-[16px]">
          <div className="px-[12px] pb-[8px] pt-[4px] text-[11px] font-bold tracking-[.08em] text-[#b6c2d2]">เมนูหลัก</div>
          <NavButton active={route === 'dashboard'} icon="dashboard" label="หน้าหลัก" onClick={() => onNavigate('dashboard')} />
          <NavButton active={route === 'create'} icon="plus-circle" label="สร้างใบค้างยา" onClick={() => onNavigate('create')} />
          <NavButton active={route === 'list'} icon="list" label="รายการใบค้างยา" onClick={() => onNavigate('list')} />
          <NavButton active={route === 'outstanding'} icon="pill" label="ยาค้างคนไข้" onClick={() => onNavigate('outstanding')} />
          {user.role === 'admin' && <NavButton active={route === 'users'} icon="users" label="จัดการผู้ใช้" onClick={() => onNavigate('users')} />}
          {(user.role === 'admin' || user.role === 'sub-admin') && <NavButton active={route === 'drugs'} icon="pill" label="จัดการรายการยา" onClick={() => onNavigate('drugs')} />}
          <div className="px-[12px] pb-[8px] pt-[18px] text-[11px] font-bold tracking-[.08em] text-[#b6c2d2]">สำหรับผู้ป่วย</div>
          <NavButton active={false} icon="search" label="ค้นหาสถานะยา" onClick={() => onNavigate('lookup')} />
        </nav>

        <div className="border-t border-[#eef2f7] p-[14px]">
          <button
            onClick={onEditProfile}
            className="flex w-full cursor-pointer items-center gap-[11px] rounded-[10px] border-0 bg-transparent px-[6px] pb-[12px] pt-[8px] text-left hover:bg-[#f8fafc]"
          >
            <span className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[#e0ecfd] text-[#1d4ed8]">
              <Icon name="user" size={20} />
            </span>
            <div className="min-w-0 flex-1 leading-[1.25]">
              <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13.5px] font-bold text-[#0f172a]">{user.name}</div>
              <div className="text-[11.5px] text-[#94a3b8]">{roleLabels[user.role] || user.role}</div>
            </div>
            <Icon name="edit" size={14} className="shrink-0 text-[#94a3b8]" />
          </button>
          <button onClick={onLogout} className="flex w-full cursor-pointer items-center justify-center gap-[9px] rounded-[11px] border border-[#e7eef7] bg-white p-[10px] text-[13.5px] font-semibold text-[#be123c] hover:border-[#fecdd3] hover:bg-[#fff1f2]">
            <Icon name="logout" size={17} />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-[62px] items-center justify-between gap-[12px] border-b border-[#e7eef7] bg-[rgba(255,255,255,.9)] px-[clamp(14px,2.5vw,26px)] backdrop-blur-[8px]">
          <div className="flex min-w-0 items-center gap-[12px]">
            <button aria-label="เปิดเมนู" onClick={onToggleSidebar} className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-[11px] border border-[#e7eef7] bg-white text-[#334155] min-[900px]:hidden">
              <Icon name="menu" size={20} />
            </button>
            <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[14.5px] font-bold text-[#1e3a5f]">{pageTitles[route] || ''}</div>
          </div>
          <div className="flex items-center gap-[14px]">
            <span className="hidden text-[12.5px] text-[#94a3b8] min-[900px]:inline">{todayThai()}</span>
            <div className="flex items-center gap-[9px] rounded-full border border-[#e7eef7] py-[5px] pl-[12px] pr-[6px]">
              <span className="text-[13px] font-semibold text-[#334155]">{user.name}</span>
              <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#1d4ed8] text-white">
                <Icon name="user" size={17} />
              </span>
            </div>
          </div>
        </header>

        <main className="w-full flex-1 p-[clamp(16px,3vw,30px)]">{children}</main>
      </div>
    </div>
  );
}

type NavButtonProps = {
  active: boolean;
  icon: 'dashboard' | 'plus-circle' | 'list' | 'search' | 'users' | 'pill';
  label: string;
  onClick: () => void;
};

function NavButton({ active, icon, label, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-[12px] rounded-[12px] border-0 px-[12px] py-[11px] text-left text-[14.5px] font-semibold ${
        active ? 'bg-[#eff6ff] text-[#1d4ed8]' : 'bg-transparent text-[#475569]'
      }`}
    >
      <Icon name={icon} />
      {label}
    </button>
  );
}
