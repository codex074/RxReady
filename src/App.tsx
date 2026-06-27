import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { StaffShell } from './components/StaffShell';
import { MOCK_TICKETS } from './data/mockTickets';
import { isSupabaseConfigured } from './lib/supabase';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CreateTicketPage } from './pages/CreateTicketPage';
import { TicketListPage } from './pages/TicketListPage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { LookupPage } from './pages/LookupPage';
import { PublicStatusPage } from './pages/PublicStatusPage';
import { PrintPage } from './pages/PrintPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { getCurrentUser, signIn, signOut } from './services/authService';
import {
  createTicket,
  getPublicStatusByToken,
  listTickets,
  lookupTicketStatus,
  updateStatus,
} from './services/ticketService';
import {
  createManagedUser,
  listManagedUsers,
  resetManagedUserPassword,
  setManagedUserActive,
  updateManagedUser,
} from './services/userService';
import type {
  StaffUser,
  Ticket,
  TicketForm,
  TicketStatus,
} from './types/backorder';
import type { AppRoute } from './types/navigation';
import type {
  CreateManagedUserInput,
  ManagedUser,
  UpdateManagedUserInput,
} from './types/user';
import { publicStatusUrl, qrDataUrl, tokenFromLocation } from './utils/qr';

const demoUser: StaffUser = {
  name: 'ภก. ศิริพร วงศ์ทอง',
  role: 'pharmacist',
  username: 'pharmacist',
};

function newFormItem() {
  return {
    id: crypto.randomUUID(),
    name: '',
    qty: '',
    unit: 'เม็ด',
    note: '',
  };
}

function blankForm(): TicketForm {
  return { hn: '', name: '', phone: '', note: '', items: [newFormItem()] };
}

function publicTicket(ticket: Ticket): Ticket {
  return {
    ...ticket,
    hn: '-',
    name: '',
    phone: '-',
    note: '',
    token: '',
    items: ticket.items.map((item) => ({
      ...item,
      name: '',
      qty: '',
      unit: '',
      note: '',
    })),
    publicOnly: true,
  };
}

export function App() {
  const initialToken = tokenFromLocation();
  const [route, setRoute] = useState<AppRoute>(initialToken ? 'public' : 'login');
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState<StaffUser>(demoUser);
  const [tickets, setTickets] = useState<Ticket[]>(isSupabaseConfigured ? [] : MOCK_TICKETS);
  const [activeId, setActiveId] = useState<string | null>(isSupabaseConfigured ? null : '0049');
  const [activeToken, setActiveToken] = useState(initialToken);
  const [publicStatus, setPublicStatus] = useState<Ticket | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [usersLoading, setUsersLoading] = useState(false);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [loginUsername, setLoginUsername] = useState(isSupabaseConfigured ? '' : 'admin');
  const [loginPassword, setLoginPassword] = useState(isSupabaseConfigured ? '' : 'demo1234');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [form, setForm] = useState<TicketForm>(blankForm);
  const [lookupNo, setLookupNo] = useState('BO-20260627-0049');
  const [lookupPhone, setLookupPhone] = useState('4567');
  const [qrUrl, setQrUrl] = useState('');

  const activeTicket = tickets.find((ticket) => ticket.id === activeId) || null;

  useEffect(() => {
    async function bootstrap() {
      if (initialToken) {
        if (!isSupabaseConfigured) {
          const match = MOCK_TICKETS.find((ticket) => ticket.token === initialToken);
          setPublicStatus(match ? publicTicket(match) : null);
          setLoading(false);
          return;
        }
        await loadPublicToken(initialToken, false);
        return;
      }

      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          setLoading(false);
          return;
        }
        const data = await listTickets();
        setUser(currentUser);
        setTickets(data);
        setActiveId(data[0]?.id || null);
        setAuthed(true);
        setRoute('dashboard');
      } catch (error) {
        await showError('โหลดข้อมูลไม่สำเร็จ', error);
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, []);

  useEffect(() => {
    function handlePopState() {
      const token = tokenFromLocation();
      if (token) {
        setActiveToken(token);
        setRoute('public');
        void loadPublicToken(token, false);
      } else if (authed) {
        setRoute('dashboard');
      } else {
        setRoute('login');
      }
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [authed]);

  useEffect(() => {
    if (route !== 'print' || !activeTicket?.token) {
      setQrUrl('');
      return;
    }
    let cancelled = false;
    void qrDataUrl(publicStatusUrl(activeTicket.token)).then((value) => {
      if (!cancelled) setQrUrl(value);
    });
    return () => {
      cancelled = true;
    };
  }, [route, activeTicket?.token]);

  function navigate(nextRoute: AppRoute, ticketId?: string) {
    if (nextRoute === 'users') {
      if (user.role !== 'admin') {
        void showError('ไม่มีสิทธิ์เข้าถึง', 'เฉพาะผู้ดูแลระบบเท่านั้น');
        return;
      }
      void loadUsers();
    }
    if (ticketId) setActiveId(ticketId);
    setSidebarOpen(false);
    setRoute(nextRoute);
    if (nextRoute !== 'public' && window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
      setActiveToken('');
    }
    window.scrollTo(0, 0);
  }

  async function reloadTickets(): Promise<Ticket[]> {
    if (!isSupabaseConfigured) return tickets;
    const data = await listTickets();
    setTickets(data);
    return data;
  }

  async function loadUsers(): Promise<void> {
    if (!isSupabaseConfigured || user.role !== 'admin') return;
    try {
      setUsersLoading(true);
      setManagedUsers(await listManagedUsers());
    } catch (error) {
      await showError('โหลดข้อมูลผู้ใช้ไม่สำเร็จ', error);
    } finally {
      setUsersLoading(false);
    }
  }

  async function handleCreateUser(input: CreateManagedUserInput): Promise<boolean> {
    try {
      setUsersLoading(true);
      const created = await createManagedUser(input);
      setManagedUsers((current) => [...current, created]);
      showToast('สร้างผู้ใช้สำเร็จ');
      return true;
    } catch (error) {
      await showError('สร้างผู้ใช้ไม่สำเร็จ', error);
      return false;
    } finally {
      setUsersLoading(false);
    }
  }

  async function handleUpdateUser(input: UpdateManagedUserInput): Promise<boolean> {
    try {
      setUsersLoading(true);
      const updated = await updateManagedUser(input);
      setManagedUsers((current) =>
        current.map((managedUser) => managedUser.id === updated.id ? updated : managedUser),
      );
      if (updated.id === user.id) {
        setUser((current) => ({
          ...current,
          name: updated.displayName,
          role: updated.role,
        }));
      }
      showToast('บันทึกข้อมูลผู้ใช้สำเร็จ');
      return true;
    } catch (error) {
      await showError('แก้ไขผู้ใช้ไม่สำเร็จ', error);
      return false;
    } finally {
      setUsersLoading(false);
    }
  }

  async function handleToggleUserActive(managedUser: ManagedUser) {
    const willActivate = !managedUser.isActive;
    const result = await Swal.fire({
      icon: willActivate ? 'question' : 'warning',
      title: willActivate
        ? `เปิดใช้งานบัญชี @${managedUser.username}?`
        : `ปิดใช้งานบัญชี @${managedUser.username}?`,
      text: willActivate
        ? 'ผู้ใช้นี้จะสามารถเข้าสู่ระบบได้อีกครั้ง'
        : 'ผู้ใช้นี้จะไม่สามารถเข้าสู่ระบบได้จนกว่าจะเปิดใช้งานอีกครั้ง',
      showCancelButton: true,
      confirmButtonColor: willActivate ? '#2563eb' : '#e11d48',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: willActivate ? 'เปิดใช้งาน' : 'ปิดใช้งาน',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    try {
      setUsersLoading(true);
      const updated = await setManagedUserActive(managedUser.id, willActivate);
      setManagedUsers((current) =>
        current.map((u) => (u.id === updated.id ? updated : u)),
      );
      showToast(willActivate ? 'เปิดใช้งานบัญชีสำเร็จ' : 'ปิดใช้งานบัญชีสำเร็จ');
    } catch (error) {
      await showError('ดำเนินการไม่สำเร็จ', error);
    } finally {
      setUsersLoading(false);
    }
  }

  async function handleResetUserPassword(managedUser: ManagedUser) {
    const result = await Swal.fire({
      icon: 'question',
      title: `ตั้งรหัสผ่านใหม่สำหรับ @${managedUser.username}`,
      input: 'password',
      inputPlaceholder: 'รหัสผ่าน/PIN ใหม่',
      inputAttributes: { autocomplete: 'new-password', minlength: '4' },
      inputValidator: (value: string) => value.length < 4 ? 'รหัสผ่านต้องมีอย่างน้อย 4 ตัว' : undefined,
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'บันทึกรหัสใหม่',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
    });
    if (!result.isConfirmed || !result.value) return;

    try {
      setUsersLoading(true);
      await resetManagedUserPassword(managedUser.id, result.value);
      showToast('ตั้งรหัสผ่านใหม่สำเร็จ');
    } catch (error) {
      await showError('ตั้งรหัสผ่านไม่สำเร็จ', error);
    } finally {
      setUsersLoading(false);
    }
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      await showError('เข้าสู่ระบบไม่สำเร็จ', 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน');
      return;
    }
    if (!isSupabaseConfigured) {
      setAuthed(true);
      setRoute('dashboard');
      showToast('เข้าสู่ระบบสำเร็จ');
      return;
    }
    try {
      setLoading(true);
      const currentUser = await signIn(loginUsername, loginPassword);
      const data = await listTickets();
      setUser(currentUser);
      setTickets(data);
      setActiveId(data[0]?.id || null);
      setAuthed(true);
      setRoute('dashboard');
      showToast('เข้าสู่ระบบสำเร็จ');
    } catch (error) {
      await showError('เข้าสู่ระบบไม่สำเร็จ', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    const result = await Swal.fire({
      icon: 'question',
      title: 'ออกจากระบบ?',
      text: 'คุณต้องการออกจากระบบใช่หรือไม่',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    try {
      if (isSupabaseConfigured) await signOut();
      setAuthed(false);
      setTickets(isSupabaseConfigured ? [] : MOCK_TICKETS);
      setRoute('login');
    } catch (error) {
      await showError('ออกจากระบบไม่สำเร็จ', error);
    }
  }

  async function handleCancelCreate() {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'ยกเลิกการสร้างใบค้างยา?',
      text: 'ข้อมูลที่กรอกจะไม่ถูกบันทึก',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'ออกจากหน้านี้',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
    });
    if (result.isConfirmed) {
      setForm(blankForm());
      navigate('dashboard');
    }
  }

  async function handleRemoveItem(itemId: string) {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'ลบรายการยานี้?',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'ลบรายการ',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
    });
    if (result.isConfirmed) {
      setForm((current) => ({
        ...current,
        items: current.items.filter((item) => item.id !== itemId),
      }));
    }
  }

  async function handleCreateTicket() {
    const validItems = form.items.filter((item) => item.name.trim());
    if (!form.name.trim() || !form.phone.trim()) {
      await showWarning('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อผู้ป่วยและเบอร์โทรศัพท์');
      return;
    }
    if (!validItems.length) {
      await showWarning('ยังไม่มีรายการยา', 'กรุณาเพิ่มรายการยาที่ค้างอย่างน้อย 1 รายการ');
      return;
    }
    if (validItems.some((item) => Number(item.qty) <= 0 || !item.unit.trim())) {
      await showWarning('รายการยาไม่ครบถ้วน', 'กรุณากรอกจำนวนและหน่วยของรายการยาทุกแถว');
      return;
    }

    const confirmation = await Swal.fire({
      icon: 'question',
      title: 'ยืนยันการบันทึกใบค้างยา?',
      text: 'ระบบจะออกเลขใบค้างยาและสร้าง QR Code สำหรับผู้ป่วย',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
    });
    if (!confirmation.isConfirmed) return;

    try {
      setLoading(true);
      let createdId: string;
      let ticketNo: string;
      if (isSupabaseConfigured) {
        const result = await createTicket({
          patientName: form.name.trim(),
          hn: form.hn.trim(),
          phone: form.phone.trim(),
          note: form.note.trim(),
          items: validItems.map((item) => ({
            drugName: item.name.trim(),
            qty: Number(item.qty),
            unit: item.unit.trim(),
            note: item.note.trim(),
          })),
        });
        const data = await reloadTickets();
        ticketNo = result.ticket_no || result.ticketNo || '';
        createdId = result.id || data.find((ticket) => ticket.no === ticketNo)?.id || '';
      } else {
        const next = String(
          Math.max(...tickets.map((ticket) => Number(ticket.no.slice(-4)))) + 1,
        ).padStart(4, '0');
        const date = new Date();
        ticketNo = `BO-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${next}`;
        createdId = crypto.randomUUID();
        const timestamp = Date.now();
        const ticket: Ticket = {
          id: createdId,
          no: ticketNo,
          hn: form.hn.trim() || '-',
          name: form.name.trim(),
          phone: form.phone.trim(),
          note: form.note.trim(),
          status: 'preparing',
          createdAt: timestamp,
          updatedAt: timestamp,
          token: crypto.randomUUID().replaceAll('-', ''),
          items: validItems.map((item) => ({
            id: item.id,
            name: item.name.trim(),
            qty: Number(item.qty),
            unit: item.unit,
            note: item.note.trim(),
            status: 'preparing',
          })),
        };
        setTickets((current) => [ticket, ...current]);
      }

      setForm(blankForm());
      setActiveId(createdId);
      const result = await Swal.fire({
        icon: 'success',
        title: 'บันทึกใบค้างยาสำเร็จ',
        html: `เลขที่ใบค้างยา <b>${ticketNo}</b>`,
        showCancelButton: true,
        confirmButtonText: 'พิมพ์ QR',
        cancelButtonText: 'ดูรายละเอียด',
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#94a3b8',
        reverseButtons: true,
      });
      navigate(result.isConfirmed ? 'print' : 'detail', createdId);
    } catch (error) {
      await showError('บันทึกใบค้างยาไม่สำเร็จ', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(status: TicketStatus) {
    if (!activeTicket) return;
    const statusText = status === 'cancelled' ? 'ยกเลิกใบค้างยา' : undefined;
    const result = await Swal.fire({
      icon: status === 'cancelled' ? 'warning' : 'question',
      title:
        status === 'ready'
          ? 'ต้องการเปลี่ยนสถานะเป็น “พร้อมรับยา” ใช่หรือไม่?'
          : status === 'picked_up'
            ? 'ต้องการบันทึกว่าผู้ป่วยรับยาแล้วใช่หรือไม่?'
            : status === 'cancelled'
              ? 'ต้องการยกเลิกใบค้างยานี้ใช่หรือไม่?'
              : 'เปลี่ยนสถานะเป็น “กำลังเตรียมยา” ?',
      text:
        status === 'ready'
          ? 'หน้าสถานะของผู้ป่วยจะแสดงว่ายาพร้อมรับแล้ว'
          : status === 'cancelled'
            ? 'กรุณาระบุเหตุผลการยกเลิกเพื่อบันทึก audit log'
            : undefined,
      input: status === 'cancelled' ? 'text' : undefined,
      inputPlaceholder: status === 'cancelled' ? 'เหตุผลการยกเลิก' : undefined,
      inputValidator:
        status === 'cancelled'
          ? (value: string) =>
              !value?.trim() ? 'กรุณาระบุเหตุผลการยกเลิก' : undefined
          : undefined,
      showCancelButton: true,
      confirmButtonColor: status === 'cancelled' ? '#e11d48' : '#2563eb',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: statusText || 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    try {
      setLoading(true);
      if (isSupabaseConfigured) {
        await updateStatus(activeTicket.id, status, result.value || undefined);
        await reloadTickets();
      } else {
        setTickets((current) =>
          current.map((ticket) =>
            ticket.id === activeTicket.id
              ? {
                  ...ticket,
                  status,
                  updatedAt: Date.now(),
                  cancelReason: result.value || '',
                  items: ticket.items.map((item) => ({ ...item, status })),
                }
              : ticket,
          ),
        );
      }
      showToast('อัปเดตสถานะสำเร็จ');
    } catch (error) {
      await showError('อัปเดตสถานะไม่สำเร็จ', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lookupNo.trim() || !lookupPhone.trim()) {
      await showWarning('กรอกข้อมูลไม่ครบ', 'กรุณากรอกเลขใบค้างยาและเบอร์โทร 4 หลักท้าย');
      return;
    }
    try {
      setLoading(true);
      const ticket = isSupabaseConfigured
        ? await lookupTicketStatus(lookupNo.trim(), lookupPhone.trim())
        : tickets.find(
            (item) =>
              item.no.toLowerCase() === lookupNo.trim().toLowerCase() &&
              item.phone.slice(-4) === lookupPhone.trim(),
          ) || null;
      if (!ticket) {
        await showWarning('ไม่พบข้อมูลใบค้างยา', 'กรุณาตรวจสอบเลขใบค้างยาและเบอร์โทรอีกครั้ง');
        return;
      }
      setPublicStatus(ticket.publicOnly ? ticket : publicTicket(ticket));
      setActiveToken('');
      setRoute('public');
    } catch (error) {
      await showError('ค้นหาสถานะไม่สำเร็จ', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadPublicToken(token: string, toast: boolean) {
    try {
      setLoading(true);
      const ticket = isSupabaseConfigured
        ? await getPublicStatusByToken(token)
        : MOCK_TICKETS.find((item) => item.token === token) || null;
      setPublicStatus(ticket && !ticket.publicOnly ? publicTicket(ticket) : ticket);
      if (toast && ticket) showToast('อัปเดตสถานะล่าสุดแล้ว', 'info');
    } catch (error) {
      await showError('โหลดสถานะไม่สำเร็จ', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshPublic() {
    if (activeToken) {
      await loadPublicToken(activeToken, true);
      return;
    }
    if (!publicStatus) return;
    const ticket = isSupabaseConfigured
      ? await lookupTicketStatus(publicStatus.no, lookupPhone)
      : tickets.find(
          (item) => item.no === publicStatus.no && item.phone.slice(-4) === lookupPhone,
        ) || null;
    setPublicStatus(ticket && !ticket.publicOnly ? publicTicket(ticket) : ticket);
    showToast('อัปเดตสถานะล่าสุดแล้ว', 'info');
  }

  async function openPublicView(ticket: Ticket) {
    if (isSupabaseConfigured) {
      const token = ticket.token;
      window.history.pushState({}, '', `/status/${encodeURIComponent(token)}`);
      setActiveToken(token);
      setRoute('public');
      await loadPublicToken(token, false);
      return;
    }
    setPublicStatus(publicTicket(ticket));
    setRoute('public');
  }

  if (route === 'login') {
    return <LoginPage username={loginUsername} password={loginPassword} loading={loading} onUsernameChange={setLoginUsername} onPasswordChange={setLoginPassword} onSubmit={handleLogin} onLookup={() => navigate('lookup')} />;
  }

  if (route === 'lookup') {
    return <LookupPage ticketNo={lookupNo} phoneLast4={lookupPhone} loading={loading} onTicketNoChange={setLookupNo} onPhoneLast4Change={setLookupPhone} onSubmit={handleLookup} onLogin={() => navigate('login')} />;
  }

  if (route === 'public') {
    return <PublicStatusPage ticket={publicStatus} loading={loading} onRefresh={handleRefreshPublic} onLookup={() => navigate('lookup')} />;
  }

  if (route === 'print' && activeTicket) {
    return <PrintPage ticket={activeTicket} qrUrl={qrUrl} onBack={() => navigate('detail', activeTicket.id)} onPublicView={() => void openPublicView(activeTicket)} />;
  }

  if (!authed) {
    return <LoginPage username={loginUsername} password={loginPassword} loading={loading} onUsernameChange={setLoginUsername} onPasswordChange={setLoginPassword} onSubmit={handleLogin} onLookup={() => navigate('lookup')} />;
  }

  return (
    <StaffShell route={route} user={user} sidebarOpen={sidebarOpen} onNavigate={navigate} onToggleSidebar={() => setSidebarOpen((open) => !open)} onCloseSidebar={() => setSidebarOpen(false)} onLogout={() => void handleLogout()}>
      {route === 'dashboard' && <DashboardPage tickets={tickets} onCreate={() => navigate('create')} onList={(status = 'all') => { setStatusFilter(status); navigate('list'); }} onView={(id) => navigate('detail', id)} onPrint={(id) => navigate('print', id)} />}
      {route === 'create' && <CreateTicketPage form={form} loading={loading} onFieldChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))} onItemChange={(itemId, field, value) => setForm((current) => ({ ...current, items: current.items.map((item) => item.id === itemId ? { ...item, [field]: value } : item) }))} onAddItem={() => setForm((current) => ({ ...current, items: [...current.items, newFormItem()] }))} onRemoveItem={(id) => void handleRemoveItem(id)} onCancel={() => void handleCancelCreate()} onSave={() => void handleCreateTicket()} />}
      {route === 'list' && <TicketListPage tickets={tickets} query={query} statusFilter={statusFilter} onQueryChange={setQuery} onStatusChange={setStatusFilter} onCreate={() => navigate('create')} onView={(id) => navigate('detail', id)} onPrint={(id) => navigate('print', id)} />}
      {route === 'detail' && activeTicket && <TicketDetailPage ticket={activeTicket} loading={loading} onBack={() => navigate('list')} onPrint={() => navigate('print', activeTicket.id)} onStatusChange={(status) => void handleStatusChange(status)} />}
      {route === 'users' && user.role === 'admin' && <UserManagementPage users={managedUsers} loading={usersLoading} currentUserId={user.id} onRefresh={loadUsers} onCreate={handleCreateUser} onUpdate={handleUpdateUser} onToggleActive={(managedUser) => void handleToggleUserActive(managedUser)} onResetPassword={(managedUser) => void handleResetUserPassword(managedUser)} />}
    </StaffShell>
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error || 'เกิดข้อผิดพลาด');
}

async function showError(title: string, error: unknown) {
  await Swal.fire({
    icon: 'error',
    title,
    text: errorMessage(error),
    confirmButtonColor: '#2563eb',
    confirmButtonText: 'ตกลง',
  });
}

async function showWarning(title: string, text: string) {
  await Swal.fire({
    icon: 'warning',
    title,
    text,
    confirmButtonColor: '#2563eb',
    confirmButtonText: 'ตกลง',
  });
}

function showToast(title: string, icon: 'success' | 'info' = 'success') {
  void Swal.fire({
    toast: true,
    position: 'top-end',
    timer: 2400,
    timerProgressBar: true,
    showConfirmButton: false,
    icon,
    title,
  });
}
