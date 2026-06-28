import { useState, useMemo } from 'react';
import type { Drug, CreateDrugInput } from '../types/drug';
import { Icon } from '../components/Icon';

type DrugManagementPageProps = {
  drugs: Drug[];
  loading: boolean;
  onRefresh: () => void;
  onCreate: (input: CreateDrugInput) => Promise<void>;
  onUpdate: (id: string, input: Partial<CreateDrugInput> & { active?: boolean }) => Promise<void>;
  onDelete: (drug: Drug) => void;
};

const COLOR_MAP: Record<string, string> = {
  เขียว: '#16a34a',
  แดง: '#dc2626',
  ม่วง: '#9333ea',
  'เขียวน้ำเงิน': '#0891b2',
  น้ำเงิน: '#2563eb',
  บานเย็น: '#ec4899',
  '255.128.0': '#ff8000',
  ดำ: '#1e293b',
  เทา: '#64748b',
};

const COLOR_OPTIONS = ['', 'เขียว', 'แดง', 'ม่วง', 'เขียวน้ำเงิน', 'น้ำเงิน', 'บานเย็น', 'ดำ', 'เทา'];

function ColorDot({ tag }: { tag: string | null }) {
  if (!tag || !COLOR_MAP[tag]) return <span className="text-[#cbd5e1]">—</span>;
  return (
    <span className="inline-flex items-center gap-[5px]">
      <span className="inline-block h-[10px] w-[10px] rounded-full" style={{ background: COLOR_MAP[tag] }} />
      <span className="text-[12px] text-[#64748b]">{tag}</span>
    </span>
  );
}

const blankForm = (): CreateDrugInput => ({ name: '', genericName: '', strength: '', unit: '', price: null, colorTag: null });

type DrugFormProps = {
  initial?: CreateDrugInput;
  onSubmit: (v: CreateDrugInput) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
};

function DrugForm({ initial, onSubmit, onCancel, submitLabel }: DrugFormProps) {
  const [form, setForm] = useState<CreateDrugInput>(initial ?? blankForm());
  const [saving, setSaving] = useState(false);
  const set = (field: keyof CreateDrugInput, value: string | number | null) =>
    setForm((f) => ({ ...f, [field]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try { await onSubmit(form); } finally { setSaving(false); }
  }

  const inp = 'w-full rounded-[10px] border border-[#cbd5e1] px-[12px] py-[9px] text-[13.5px] text-[#0f172a] outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,.13)]';
  const lbl = 'mb-[5px] block text-[12px] font-semibold text-[#475569]';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[13px]">
      <div>
        <label className={lbl}>ชื่อยา <span className="text-[#e11d48]">*</span></label>
        <input required value={form.name} onChange={(e) => set('name', e.target.value)} className={inp} placeholder="เช่น Metformin 500 mg" />
      </div>
      <div>
        <label className={lbl}>ชื่อยาสามัญ</label>
        <input value={form.genericName} onChange={(e) => set('genericName', e.target.value)} className={inp} placeholder="เช่น METFORMIN" />
      </div>
      <div className="grid grid-cols-2 gap-[12px]">
        <div>
          <label className={lbl}>ความแรง</label>
          <input value={form.strength} onChange={(e) => set('strength', e.target.value)} className={inp} placeholder="เช่น 500 mg" />
        </div>
        <div>
          <label className={lbl}>หน่วยนับ</label>
          <input value={form.unit} onChange={(e) => set('unit', e.target.value)} className={inp} placeholder="เช่น TAB" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-[12px]">
        <div>
          <label className={lbl}>ราคา (บาท)</label>
          <input
            type="number" min="0" step="0.01"
            value={form.price ?? ''}
            onChange={(e) => set('price', e.target.value === '' ? null : Number(e.target.value))}
            className={inp} placeholder="0.00"
          />
        </div>
        <div>
          <label className={lbl}>สี</label>
          <select value={form.colorTag ?? ''} onChange={(e) => set('colorTag', e.target.value || null)} className={`${inp} bg-white`}>
            {COLOR_OPTIONS.map((c) => <option key={c} value={c}>{c || '— ไม่ระบุ'}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-[10px] pt-[4px]">
        <button type="button" onClick={onCancel} className="cursor-pointer rounded-[10px] border border-[#cbd5e1] bg-white px-[18px] py-[9px] text-[13.5px] font-semibold text-[#475569] hover:bg-[#f8fafc]">ยกเลิก</button>
        <button type="submit" disabled={saving || !form.name.trim()} className="inline-flex cursor-pointer items-center gap-[7px] rounded-[10px] border-0 bg-[#2563eb] px-[18px] py-[9px] text-[13.5px] font-bold text-white disabled:opacity-50 hover:bg-[#1d4ed8]">
          {saving ? 'กำลังบันทึก...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

type ModalProps = { title: string; onClose: () => void; children: React.ReactNode };
function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,.55)] px-[16px]">
      <div className="w-full max-w-[500px] rounded-[18px] border border-[#e7eef7] bg-white p-[26px] shadow-[0_20px_60px_-20px_rgba(15,42,90,.45)]">
        <div className="mb-[18px] flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-[#0f172a]">{title}</h2>
          <button onClick={onClose} className="inline-flex h-[32px] w-[32px] cursor-pointer items-center justify-center rounded-[8px] border-0 bg-transparent text-[#94a3b8] hover:bg-[#f1f5f9]"><Icon name="x" size={17} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DrugManagementPage({ drugs, loading, onRefresh, onCreate, onUpdate, onDelete }: DrugManagementPageProps) {
  const [query, setQuery] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Drug | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return drugs.filter((d) => {
      if (filterActive === 'active' && !d.active) return false;
      if (filterActive === 'inactive' && d.active) return false;
      if (!q) return true;
      return d.name.toLowerCase().includes(q) || d.genericName.toLowerCase().includes(q) || d.strength.toLowerCase().includes(q);
    });
  }, [drugs, query, filterActive]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleQueryChange(v: string) { setQuery(v); setPage(1); }
  function handleFilterChange(v: typeof filterActive) { setFilterActive(v); setPage(1); }

  async function handleCreate(input: CreateDrugInput) {
    await onCreate(input);
    setShowCreate(false);
  }

  async function handleEdit(input: CreateDrugInput) {
    if (!editTarget) return;
    await onUpdate(editTarget.id, input);
    setEditTarget(null);
  }

  async function handleToggleActive(drug: Drug) {
    await onUpdate(drug.id, { active: !drug.active });
  }

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-[20px] flex flex-wrap items-center justify-between gap-[12px]">
        <div>
          <h1 className="text-[clamp(18px,3vw,24px)] font-bold text-[#0f172a]">จัดการรายการยา</h1>
          <p className="mt-[2px] text-[13px] text-[#64748b]">
            {drugs.length.toLocaleString()} รายการ · แสดง {filtered.length.toLocaleString()} รายการ
          </p>
        </div>
        <div className="flex gap-[10px]">
          <button onClick={onRefresh} disabled={loading} className="inline-flex cursor-pointer items-center gap-[7px] rounded-[11px] border border-[#cbd5e1] bg-white px-[14px] py-[9px] text-[13.5px] font-semibold text-[#475569] hover:bg-[#f8fafc] disabled:opacity-50">
            <Icon name="refresh" size={16} />โหลดใหม่
          </button>
          <button onClick={() => setShowCreate(true)} className="inline-flex cursor-pointer items-center gap-[7px] rounded-[11px] border-0 bg-[#2563eb] px-[16px] py-[9px] text-[13.5px] font-bold text-white hover:bg-[#1d4ed8]">
            <Icon name="plus" size={16} strokeWidth={2.5} />เพิ่มรายการยา
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-[16px] flex flex-wrap gap-[10px]">
        <div className="relative flex-1" style={{ minWidth: '220px' }}>
          <Icon name="search" size={16} className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="ค้นหาชื่อยา, ชื่อยาสามัญ, ความแรง..."
            className="w-full rounded-[11px] border border-[#cbd5e1] py-[10px] pl-[38px] pr-[14px] text-[13.5px] outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,.13)]"
          />
        </div>
        <div className="flex rounded-[11px] border border-[#e2e8f0] bg-[#f8fafc] p-[3px]">
          {(['all', 'active', 'inactive'] as const).map((v) => (
            <button
              key={v}
              onClick={() => handleFilterChange(v)}
              className={`cursor-pointer rounded-[9px] border-0 px-[14px] py-[7px] text-[13px] font-semibold transition-colors ${filterActive === v ? 'bg-white text-[#1d4ed8] shadow-[0_1px_4px_rgba(15,42,90,.12)]' : 'bg-transparent text-[#64748b]'}`}
            >
              {v === 'all' ? 'ทั้งหมด' : v === 'active' ? 'ใช้งาน' : 'ปิดใช้'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[16px] border border-[#e7eef7] bg-white">
        {loading ? (
          <div className="py-[60px] text-center text-[14px] text-[#94a3b8]">กำลังโหลด...</div>
        ) : pageData.length === 0 ? (
          <div className="py-[60px] text-center text-[14px] text-[#94a3b8]">ไม่พบรายการยา</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-[13px]">
              <thead>
                <tr className="border-b border-[#f1f5f9] bg-[#f8fafc] text-left text-[11.5px] font-bold uppercase tracking-wider text-[#94a3b8]">
                  <th className="px-[16px] py-[12px]">ชื่อยา</th>
                  <th className="px-[12px] py-[12px]">ชื่อยาสามัญ</th>
                  <th className="px-[12px] py-[12px]">ความแรง</th>
                  <th className="px-[12px] py-[12px]">หน่วย</th>
                  <th className="px-[12px] py-[12px] text-right">ราคา</th>
                  <th className="px-[12px] py-[12px]">สี</th>
                  <th className="px-[12px] py-[12px]">สถานะ</th>
                  <th className="px-[16px] py-[12px] text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((drug) => (
                  <tr key={drug.id} className={`border-b border-[#f8fafc] last:border-0 hover:bg-[#fafcff] ${!drug.active ? 'opacity-50' : ''}`}>
                    <td className="max-w-[260px] px-[16px] py-[10px]">
                      <span className="line-clamp-2 font-semibold text-[#0f172a]">{drug.name}</span>
                    </td>
                    <td className="max-w-[180px] px-[12px] py-[10px] text-[#475569]">
                      <span className="line-clamp-1">{drug.genericName || '—'}</span>
                    </td>
                    <td className="whitespace-nowrap px-[12px] py-[10px] text-[#64748b]">{drug.strength || '—'}</td>
                    <td className="whitespace-nowrap px-[12px] py-[10px] text-[#64748b]">{drug.unit || '—'}</td>
                    <td className="whitespace-nowrap px-[12px] py-[10px] text-right tabular-nums text-[#334155]">
                      {drug.price != null ? drug.price.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className="px-[12px] py-[10px]"><ColorDot tag={drug.colorTag} /></td>
                    <td className="px-[12px] py-[10px]">
                      <button
                        onClick={() => void handleToggleActive(drug)}
                        className={`inline-flex cursor-pointer items-center gap-[5px] rounded-[7px] border px-[10px] py-[4px] text-[12px] font-semibold ${drug.active ? 'border-[#bbf7d0] bg-[#f0fdf4] text-[#16a34a]' : 'border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]'}`}
                      >
                        {drug.active ? <><Icon name="check" size={13} />ใช้งาน</> : <>ปิดใช้</>}
                      </button>
                    </td>
                    <td className="px-[16px] py-[10px]">
                      <div className="flex justify-end gap-[6px]">
                        <button
                          onClick={() => setEditTarget(drug)}
                          className="inline-flex cursor-pointer items-center gap-[5px] rounded-[8px] border border-[#e2e8f0] bg-white px-[10px] py-[5px] text-[12px] font-semibold text-[#475569] hover:bg-[#f8fafc]"
                        >
                          <Icon name="edit" size={13} />แก้ไข
                        </button>
                        <button
                          onClick={() => onDelete(drug)}
                          className="inline-flex cursor-pointer items-center gap-[5px] rounded-[8px] border border-[#fecdd3] bg-[#fff1f2] px-[10px] py-[5px] text-[12px] font-semibold text-[#e11d48] hover:bg-[#ffe4e6]"
                        >
                          <Icon name="trash" size={13} />ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-[16px] flex items-center justify-between">
          <span className="text-[13px] text-[#64748b]">
            หน้า {page} / {totalPages} · รายการ {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} จาก {filtered.length}
          </span>
          <div className="flex gap-[6px]">
            <PageBtn label="‹" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} />
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const n = start + i;
              return <PageBtn key={n} label={String(n)} active={n === page} disabled={false} onClick={() => setPage(n)} />;
            })}
            <PageBtn label="›" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} />
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <Modal title="เพิ่มรายการยา" onClose={() => setShowCreate(false)}>
          <DrugForm submitLabel="เพิ่มรายการยา" onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
        </Modal>
      )}

      {/* Edit modal */}
      {editTarget && (
        <Modal title="แก้ไขรายการยา" onClose={() => setEditTarget(null)}>
          <DrugForm
            initial={{ name: editTarget.name, genericName: editTarget.genericName, strength: editTarget.strength, unit: editTarget.unit, price: editTarget.price, colorTag: editTarget.colorTag }}
            submitLabel="บันทึกการแก้ไข"
            onSubmit={handleEdit}
            onCancel={() => setEditTarget(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function PageBtn({ label, active, disabled, onClick }: { label: string; active?: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[34px] cursor-pointer rounded-[8px] border px-[8px] py-[6px] text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${active ? 'border-[#2563eb] bg-[#2563eb] text-white' : 'border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc]'}`}
    >
      {label}
    </button>
  );
}
