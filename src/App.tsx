import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { StaffShell } from './components/StaffShell';
import { MOCK_TICKETS } from './data/mockTickets';
import { isSupabaseConfigured } from './lib/supabase';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CreateTicketPage } from './pages/CreateTicketPage';
import { TicketListPage } from './pages/TicketListPage';
import { OutstandingDrugsPage } from './pages/OutstandingDrugsPage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { LookupPage } from './pages/LookupPage';
import { PublicStatusPage } from './pages/PublicStatusPage';
import { PrintPage } from './pages/PrintPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { DrugManagementPage } from './pages/DrugManagementPage';
import { getCurrentUser, signIn, signOut, updateSelfProfile, updateSelfPassword } from './services/authService';
import { composeName } from './utils/name';
import { EditProfileModal } from './components/EditProfileModal';
import {
  createTicket,
  getPublicStatusByToken,
  listTickets,
  lookupTicketStatus,
  lookupTicketStatusByDate,
  updateStatus,
} from './services/ticketService';
import {
  createManagedUser,
  listManagedUsers,
  resetManagedUserPassword,
  setManagedUserActive,
  updateManagedUser,
} from './services/userService';
import {
  listDrugs,
  createDrug,
  updateDrug,
  deleteDrug,
} from './services/drugService';
import type {
  StaffUser,
  Ticket,
  TicketForm,
  TicketStatus,
} from './types/backorder';
import type { Drug, CreateDrugInput, UpdateDrugInput } from './types/drug';
import type { AppRoute } from './types/navigation';
import type {
  CreateManagedUserInput,
  ManagedUser,
  UpdateManagedUserInput,
} from './types/user';
import { publicStatusUrl, qrDataUrl, tokenFromLocation } from './utils/qr';

const demoUser: StaffUser = {
  name: 'ภญ.ศิริพร วงศ์ทอง',
  prefix: 'ภญ.',
  firstName: 'ศิริพร',
  lastName: 'วงศ์ทอง',
  role: 'admin',
  username: 'admin',
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
  const [publicStatuses, setPublicStatuses] = useState<Ticket[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [usersLoading, setUsersLoading] = useState(false);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [drugsLoading, setDrugsLoading] = useState(false);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [loginUsername, setLoginUsername] = useState(isSupabaseConfigured ? '' : 'admin');
  const [loginPassword, setLoginPassword] = useState(isSupabaseConfigured ? '' : 'demo1234');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [form, setForm] = useState<TicketForm>(blankForm);
  const [lookupDate, setLookupDate] = useState(new Date().toISOString().slice(0, 10));
  const [lookupPhone, setLookupPhone] = useState('');
  const [qrUrl, setQrUrl] = useState('');

  const activeTicket = tickets.find((ticket) => ticket.id === activeId) || null;

  useEffect(() => {
    async function bootstrap() {
      if (initialToken) {
        if (!isSupabaseConfigured) {
          const match = MOCK_TICKETS.find((ticket) => ticket.token === initialToken);
          setPublicStatuses(match ? [publicTicket(match)] : []);
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
    if (nextRoute === 'drugs') {
      if (user.role !== 'admin' && user.role !== 'sub-admin') {
        void showError('ไม่มีสิทธิ์เข้าถึง', 'เฉพาะผู้ดูแลระบบและผู้ดูแลรองเท่านั้น');
        return;
      }
      void loadDrugs();
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

  async function loadDrugs(): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      setDrugsLoading(true);
      setDrugs(await listDrugs());
    } catch (error) {
      await showError('โหลดรายการยาไม่สำเร็จ', error);
    } finally {
      setDrugsLoading(false);
    }
  }

  async function handleCreateDrug(input: CreateDrugInput): Promise<void> {
    try {
      const created = await createDrug(input);
      setDrugs((current) => [created, ...current].sort((a, b) => a.name.localeCompare(b.name, 'th')));
      showToast('เพิ่มรายการยาสำเร็จ');
    } catch (error) {
      await showError('เพิ่มรายการยาไม่สำเร็จ', error);
      throw error;
    }
  }

  async function handleUpdateDrug(id: string, input: UpdateDrugInput): Promise<void> {
    try {
      const updated = await updateDrug(id, input);
      setDrugs((current) => current.map((d) => d.id === id ? updated : d));
    } catch (error) {
      await showError('แก้ไขรายการยาไม่สำเร็จ', error);
      throw error;
    }
  }

  async function handleDeleteDrug(drug: Drug): Promise<void> {
    const result = await Swal.fire({
      icon: 'warning',
      title: `ลบ "${drug.name}"?`,
      text: 'การลบไม่สามารถยกเลิกได้',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#94a3b8',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      await deleteDrug(drug.id);
      setDrugs((current) => current.filter((d) => d.id !== drug.id));
      showToast('ลบรายการยาสำเร็จ');
    } catch (error) {
      await showError('ลบรายการยาไม่สำเร็จ', error);
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
          name: updated.fullName,
          prefix: updated.prefix,
          firstName: updated.firstName,
          lastName: updated.lastName,
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
      const [data] = await Promise.all([listTickets(), loadDrugs()]);
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

  async function handleSaveProfile(
    prefix: string,
    firstName: string,
    lastName: string,
    newPassword?: string,
  ): Promise<void> {
    try {
      setLoading(true);
      if (isSupabaseConfigured) {
        const updated = await updateSelfProfile(prefix, firstName, lastName);
        setUser(updated);
        if (newPassword) await updateSelfPassword(newPassword);
      } else {
        setUser((current) => ({
          ...current,
          prefix,
          firstName,
          lastName,
          name: composeName(prefix, firstName, lastName),
        }));
      }
      setShowEditProfile(false);
      showToast('บันทึกข้อมูลสำเร็จ');
    } catch (error) {
      await showError('บันทึกข้อมูลไม่สำเร็จ', error);
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
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (!form.name.trim()) {
      await showWarning('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อ-สกุลผู้ป่วย');
      return;
    }
    if (phoneDigits.length !== 10) {
      await showWarning('เบอร์โทรศัพท์ไม่ถูกต้อง', 'กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก');
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
        ticketNo = `USC-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${next}`;
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
    if (!lookupDate || lookupPhone.trim().length !== 4) {
      await showWarning('กรอกข้อมูลไม่ครบ', 'กรุณากรอกวันที่รับบริการและเบอร์โทร 4 หลักท้าย');
      return;
    }
    try {
      setLoading(true);
      const found = isSupabaseConfigured
        ? await lookupTicketStatusByDate(lookupDate, lookupPhone.trim())
        : tickets.filter((item) => {
            const itemDate = new Date(item.createdAt).toISOString().slice(0, 10);
            return itemDate === lookupDate && item.phone.slice(-4) === lookupPhone.trim();
          });
      if (!found.length) {
        await showWarning('ไม่พบข้อมูลใบค้างยา', 'กรุณาตรวจสอบวันที่รับบริการและเบอร์โทรอีกครั้ง');
        return;
      }
      setPublicStatuses(found.map((t) => (t.publicOnly ? t : publicTicket(t))));
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
      setPublicStatuses(ticket ? [ticket && !ticket.publicOnly ? publicTicket(ticket) : ticket] : []);
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
    if (!publicStatuses.length) return;
    const found = isSupabaseConfigured
      ? await lookupTicketStatusByDate(lookupDate, lookupPhone)
      : tickets.filter((item) => {
          const itemDate = new Date(item.createdAt).toISOString().slice(0, 10);
          return itemDate === lookupDate && item.phone.slice(-4) === lookupPhone;
        });
    setPublicStatuses(found.map((t) => (t.publicOnly ? t : publicTicket(t))));
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
    setPublicStatuses([publicTicket(ticket)]);
    setRoute('public');
  }

  if (route === 'login') {
    return <LoginPage username={loginUsername} password={loginPassword} loading={loading} onUsernameChange={setLoginUsername} onPasswordChange={setLoginPassword} onSubmit={handleLogin} onLookup={() => navigate('lookup')} />;
  }

  if (route === 'lookup') {
    return <LookupPage visitDate={lookupDate} phoneLast4={lookupPhone} loading={loading} onVisitDateChange={setLookupDate} onPhoneLast4Change={setLookupPhone} onSubmit={handleLookup} onLogin={() => navigate('login')} />;
  }

  if (route === 'public') {
    return <PublicStatusPage tickets={publicStatuses} loading={loading} onRefresh={handleRefreshPublic} onLookup={() => navigate('lookup')} />;
  }

  if (route === 'print' && activeTicket) {
    return <PrintPage ticket={activeTicket} qrUrl={qrUrl} onBack={() => navigate('detail', activeTicket.id)} onPublicView={() => void openPublicView(activeTicket)} />;
  }

  if (!authed) {
    return <LoginPage username={loginUsername} password={loginPassword} loading={loading} onUsernameChange={setLoginUsername} onPasswordChange={setLoginPassword} onSubmit={handleLogin} onLookup={() => navigate('lookup')} />;
  }

  return (
    <>
      <StaffShell route={route} user={user} sidebarOpen={sidebarOpen} onNavigate={navigate} onToggleSidebar={() => setSidebarOpen((open) => !open)} onCloseSidebar={() => setSidebarOpen(false)} onLogout={() => void handleLogout()} onEditProfile={() => setShowEditProfile(true)}>
        {route === 'dashboard' && <DashboardPage tickets={tickets} onCreate={() => navigate('create')} onList={(status = 'all') => { setStatusFilter(status); navigate('list'); }} onView={(id) => navigate('detail', id)} onPrint={(id) => navigate('print', id)} />}
        {route === 'create' && <CreateTicketPage form={form} loading={loading} drugs={drugs} onFieldChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))} onItemChange={(itemId, field, value) => setForm((current) => ({ ...current, items: current.items.map((item) => item.id === itemId ? { ...item, [field]: value } : item) }))} onItemSelect={(itemId, drug) => setForm((current) => ({ ...current, items: current.items.map((item) => item.id === itemId ? { ...item, name: drug.name, unit: drug.unit || item.unit } : item) }))} onAddItem={() => setForm((current) => ({ ...current, items: [...current.items, newFormItem()] }))} onRemoveItem={(id) => void handleRemoveItem(id)} onCancel={() => void handleCancelCreate()} onSave={() => void handleCreateTicket()} />}
        {route === 'list' && <TicketListPage tickets={tickets} query={query} statusFilter={statusFilter} onQueryChange={setQuery} onStatusChange={setStatusFilter} onCreate={() => navigate('create')} onView={(id) => navigate('detail', id)} onPrint={(id) => navigate('print', id)} />}
        {route === 'outstanding' && <OutstandingDrugsPage tickets={tickets} onView={(id) => navigate('detail', id)} />}
        {route === 'detail' && activeTicket && <TicketDetailPage ticket={activeTicket} loading={loading} onBack={() => navigate('list')} onPrint={() => navigate('print', activeTicket.id)} onStatusChange={(status) => void handleStatusChange(status)} />}
        {route === 'users' && user.role === 'admin' && <UserManagementPage users={managedUsers} loading={usersLoading} currentUserId={user.id} onRefresh={loadUsers} onCreate={handleCreateUser} onUpdate={handleUpdateUser} onToggleActive={(managedUser) => void handleToggleUserActive(managedUser)} onResetPassword={(managedUser) => void handleResetUserPassword(managedUser)} />}
        {route === 'drugs' && (user.role === 'admin' || user.role === 'sub-admin') && <DrugManagementPage drugs={drugs} loading={drugsLoading} onRefresh={() => void loadDrugs()} onCreate={handleCreateDrug} onUpdate={handleUpdateDrug} onDelete={(drug) => void handleDeleteDrug(drug)} />}
      </StaffShell>
      {showEditProfile && (
        <EditProfileModal
          user={user}
          loading={loading}
          onSave={(prefix, firstName, lastName, newPassword) => handleSaveProfile(prefix, firstName, lastName, newPassword)}
          onClose={() => setShowEditProfile(false)}
        />
      )}
    </>
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
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
