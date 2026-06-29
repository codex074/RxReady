import { useState, useRef, useEffect } from 'react';
import type { TicketForm } from '../types/backorder';
import type { Drug } from '../types/drug';
import { Icon } from '../components/Icon';
import { drugNameColor } from '../utils/drugColor';
import { PatientLookupSettingsModal } from '../components/PatientLookupSettingsModal';
import {
  isDesktopApp,
  isPatientLookupConfigured,
  lookupPatientByHn,
} from '../services/patientService';

type CreateTicketPageProps = {
  mode?: 'create' | 'edit';
  form: TicketForm;
  loading: boolean;
  drugs: Drug[];
  onFieldChange: (field: keyof Omit<TicketForm, 'items'>, value: string) => void;
  onItemChange: (itemId: string, field: 'name' | 'qty' | 'unit' | 'note', value: string) => void;
  onItemSelect: (itemId: string, drug: Drug) => void;
  onAddItem: () => void;
  onRemoveItem: (itemId: string) => void;
  onCancel: () => void;
  onSave: () => void;
  canConfigurePatientLookup?: boolean;
};

const inputClass =
  'w-full rounded-[11px] border border-[#cbd5e1] px-[13px] py-[11px] text-[14px] text-[#0f172a] outline-none transition focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,.15)]';

function padHN(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return value;
  if (digits.length === 7) return '00' + digits;
  if (digits.length < 9) return digits.padStart(9, '0');
  return digits.slice(0, 9);
}

export function CreateTicketPage({
  mode = 'create',
  form,
  loading,
  drugs,
  onFieldChange,
  onItemChange,
  onItemSelect,
  onAddItem,
  onRemoveItem,
  onCancel,
  onSave,
  canConfigurePatientLookup = false,
}: CreateTicketPageProps) {
  const editing = mode === 'edit';
  const desktopLookupAvailable = isDesktopApp();
  const [lookupConfigured, setLookupConfigured] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMessage, setLookupMessage] = useState('');
  const [lookupMessageType, setLookupMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [showLookupSettings, setShowLookupSettings] = useState(false);

  useEffect(() => {
    if (!desktopLookupAvailable) return;
    let cancelled = false;
    void isPatientLookupConfigured()
      .then((configured) => {
        if (!cancelled) setLookupConfigured(configured);
      })
      .catch(() => {
        if (!cancelled) setLookupConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, [desktopLookupAvailable]);

  async function handlePatientLookup() {
    const hn = padHN(form.hn);
    if (!hn.replace(/\D/g, '')) {
      setLookupMessageType('error');
      setLookupMessage('กรุณากรอก HN ก่อนค้นหา');
      return;
    }
    if (hn !== form.hn) onFieldChange('hn', hn);

    setLookupLoading(true);
    setLookupMessageType('info');
    setLookupMessage('กำลังค้นหาข้อมูลผู้ป่วย...');
    try {
      const result = await lookupPatientByHn(hn);
      if (!result.ok) {
        if (result.code === 'NOT_CONFIGURED') setLookupConfigured(false);
        setLookupMessageType('error');
        setLookupMessage(result.message);
        return;
      }
      onFieldChange('hn', result.patient.hn);
      onFieldChange('name', result.patient.fullName);
      setLookupMessageType('success');
      setLookupMessage('พบข้อมูลผู้ป่วยและเติมชื่อให้แล้ว');
    } catch {
      setLookupMessageType('error');
      setLookupMessage('เชื่อมต่อ HOSxP ไม่สำเร็จ กรุณากรอกชื่อเอง');
    } finally {
      setLookupLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-[900px] animate-fade-up">
      <button onClick={onCancel} className="mb-[14px] inline-flex cursor-pointer items-center gap-[6px] border-0 bg-transparent p-0 text-[13.5px] font-semibold text-[#64748b] hover:text-[#2563eb]">{editing ? '← กลับหน้ารายละเอียด' : '← กลับหน้าหลัก'}</button>
      <h1 className="mb-[4px] text-[clamp(20px,3vw,26px)] font-bold text-[#0f172a]">{editing ? 'แก้ไขใบค้างรับยา' : 'สร้างใบค้างรับยา'}</h1>
      <p className="mb-[22px] text-[13.5px] text-[#64748b]">{editing ? 'แก้ไขข้อมูลผู้ป่วยและรายการยาที่ค้าง' : 'กรอกข้อมูลผู้ป่วยและรายการยาที่ค้าง ระบบจะออกเลขใบค้างรับยาและ QR Code ให้อัตโนมัติ'}</p>

      <div className="mb-[16px] rounded-[18px] border border-[#e7eef7] bg-white p-[22px]">
        <h2 className="mb-[3px] text-[16px] font-bold text-[#0f172a]">ข้อมูลผู้ป่วย</h2>
        <p className="text-[12.5px] text-[#94a3b8]">ข้อมูลพื้นฐานสำหรับติดตามใบค้างรับยา</p>
        <div className="mt-[18px] grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[15px]">
          <Field label="HN" required>
            <div className="flex items-stretch gap-[8px]">
              <input
                value={form.hn}
                onChange={(event) => {
                  onFieldChange('hn', event.target.value.replace(/\D/g, '').slice(0, 9));
                  setLookupMessage('');
                }}
                onBlur={(event) => { const padded = padHN(event.target.value); if (padded !== form.hn) onFieldChange('hn', padded); }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && desktopLookupAvailable && lookupConfigured) {
                    event.preventDefault();
                    void handlePatientLookup();
                  }
                }}
                placeholder="เช่น 0012453"
                inputMode="numeric"
                maxLength={9}
                className={inputClass}
              />
              {desktopLookupAvailable && (
                <button
                  type="button"
                  onClick={() => void handlePatientLookup()}
                  disabled={lookupLoading || !lookupConfigured || !form.hn.trim()}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-[6px] rounded-[11px] border border-[#bfdbfe] bg-[#eff6ff] px-[13px] text-[13px] font-bold text-[#1d4ed8] hover:bg-[#dbeafe] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name={lookupLoading ? 'refresh' : 'search'} size={16} />
                  {lookupLoading ? 'กำลังค้นหา' : 'ค้นหา'}
                </button>
              )}
            </div>
            {desktopLookupAvailable && (
              <div className="mt-[6px] flex min-h-[20px] flex-wrap items-center gap-x-[8px] gap-y-[4px]">
                <span
                  role="status"
                  className={`text-[11.5px] ${
                    lookupMessageType === 'success'
                      ? 'text-[#15803d]'
                      : lookupMessageType === 'error'
                        ? 'text-[#be123c]'
                        : 'text-[#64748b]'
                  }`}
                >
                  {lookupMessage || (lookupConfigured ? 'พร้อมค้นหาจาก HOSxP' : 'ยังไม่ได้ตั้งค่า API — สามารถกรอกชื่อเองได้')}
                </span>
                {canConfigurePatientLookup && (
                  <button
                    type="button"
                    onClick={() => setShowLookupSettings(true)}
                    className="cursor-pointer border-0 bg-transparent p-0 text-[11.5px] font-semibold text-[#2563eb] hover:underline"
                  >
                    {lookupConfigured ? 'แก้ไขการตั้งค่า' : 'ตั้งค่า API'}
                  </button>
                )}
              </div>
            )}
          </Field>
          <Field label="ชื่อ-สกุลผู้ป่วย" required>
            <input value={form.name} onChange={(event) => onFieldChange('name', event.target.value)} placeholder="เช่น สมชาย ใจดี" className={inputClass} />
          </Field>
          <Field label="เบอร์โทรศัพท์" required>
            <input
              value={form.phone}
              onChange={(event) => onFieldChange('phone', event.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="08xxxxxxxx"
              inputMode="numeric"
              maxLength={10}
              className={inputClass}
            />
          </Field>
          <div className="col-span-full">
            <Field label="หมายเหตุ">
              <input value={form.note} onChange={(event) => onFieldChange('note', event.target.value)} placeholder="ข้อมูลเพิ่มเติม เช่น นัดติดตาม / ยาเข้าวันที่" className={inputClass} />
            </Field>
          </div>
        </div>
      </div>

      <div className="mb-[18px] rounded-[18px] border border-[#e7eef7] bg-white p-[22px]">
        <div className="flex flex-wrap items-center justify-between gap-[12px]">
          <div><h2 className="mb-[3px] text-[16px] font-bold text-[#0f172a]">รายการยาที่ค้าง</h2><p className="text-[12.5px] text-[#94a3b8]">เพิ่มรายการยาที่ผู้ป่วยยังไม่ได้รับ</p></div>
          <button onClick={onAddItem} className="inline-flex cursor-pointer items-center gap-[7px] rounded-[11px] border border-[#bfdbfe] bg-[#eff6ff] px-[15px] py-[9px] text-[13.5px] font-bold text-[#1d4ed8] hover:bg-[#dbeafe]"><Icon name="plus" size={16} strokeWidth={2.4} />เพิ่มรายการยา</button>
        </div>
        <div className="mt-[18px] flex flex-col gap-[12px]">
          {form.items.map((item, index) => (
            <div key={item.id} className="flex flex-wrap items-end gap-[11px] rounded-[14px] border border-[#eef2f7] bg-[#fafcff] p-[14px]">
              <div className="mb-px flex h-[28px] w-[28px] shrink-0 items-center justify-center self-end rounded-[8px] bg-[#e0ecfd] text-[13px] font-bold text-[#1d4ed8]">{index + 1}</div>
              <DrugField label="ชื่อยา" className="min-w-[150px] flex-[3_1_200px]">
                <DrugAutocomplete
                  value={item.name}
                  drugs={drugs}
                  onChange={(v) => onItemChange(item.id, 'name', v)}
                  onSelect={(drug) => onItemSelect(item.id, drug)}
                />
              </DrugField>
              <DrugField label="จำนวนค้าง" className="min-w-[72px] flex-[1_1_80px]">
                <input value={item.qty} onChange={(event) => onItemChange(item.id, 'qty', event.target.value)} placeholder="0" inputMode="numeric" className={drugInputClass} />
              </DrugField>
              <DrugField label="หน่วย" className="min-w-[84px] flex-[1_1_90px]">
                <select value={item.unit} onChange={(event) => onItemChange(item.id, 'unit', event.target.value)} className={`${drugInputClass} bg-white px-[10px]`}>
                  {['เม็ด', 'แคปซูล', 'ขวด', 'หลอด', 'แผง', 'ชุด', 'ซอง'].map((unit) => <option key={unit}>{unit}</option>)}
                </select>
              </DrugField>
              <DrugField label="หมายเหตุ" className="min-w-[110px] flex-[2_1_130px]">
                <input value={item.note} onChange={(event) => onItemChange(item.id, 'note', event.target.value)} placeholder="—" className={drugInputClass} />
              </DrugField>
              {form.items.length > 1 && (
                <button aria-label="ลบรายการ" title="ลบรายการ" onClick={() => onRemoveItem(item.id)} className="inline-flex h-[39px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-[#fecdd3] bg-[#fff1f2] text-[#e11d48] hover:bg-[#ffe4e6]"><Icon name="trash" size={16} /></button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-[12px]">
        <button onClick={onCancel} className="cursor-pointer rounded-[12px] border border-[#cbd5e1] bg-white px-[22px] py-[12px] text-[14.5px] font-semibold text-[#475569] hover:bg-[#f8fafc]">ยกเลิก</button>
        <button onClick={onSave} disabled={loading} className="inline-flex cursor-pointer items-center gap-[8px] rounded-[12px] border-0 bg-[#2563eb] px-[26px] py-[12px] text-[14.5px] font-bold text-white hover:bg-[#1d4ed8]"><Icon name="save" size={18} />{loading ? 'กำลังบันทึก...' : editing ? 'บันทึกการแก้ไข' : 'บันทึกใบค้างรับยา'}</button>
      </div>
      {showLookupSettings && (
        <PatientLookupSettingsModal
          onClose={() => setShowLookupSettings(false)}
          onSaved={() => {
            setLookupConfigured(true);
            setLookupMessageType('success');
            setLookupMessage('บันทึกการตั้งค่า HOSxP API แล้ว');
            setShowLookupSettings(false);
          }}
        />
      )}
    </div>
  );
}

const MAX_SUGGESTIONS = 30;

type DrugAutocompleteProps = {
  value: string;
  drugs: Drug[];
  onChange: (v: string) => void;
  onSelect: (drug: Drug) => void;
};

function DrugAutocomplete({ value, drugs, onChange, onSelect }: DrugAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const suggestions = value.trim().length >= 1
    ? drugs
        .filter((d) => d.active && (
          d.name.toLowerCase().includes(value.toLowerCase()) ||
          d.genericName.toLowerCase().includes(value.toLowerCase())
        ))
        .slice(0, MAX_SUGGESTIONS)
    : [];

  useEffect(() => { setActiveIdx(0); }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(suggestions[activeIdx]); }
    else if (e.key === 'Escape') setOpen(false);
  }

  function pick(drug: Drug) {
    onSelect(drug);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (value.trim()) setOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder="พิมพ์เพื่อค้นหายา..."
        className={drugInputClass}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-[260px] w-full min-w-[280px] overflow-y-auto rounded-[12px] border border-[#e2e8f0] bg-white py-[4px] shadow-[0_8px_30px_-8px_rgba(15,42,90,.22)]"
        >
          {suggestions.map((drug, i) => (
            <li key={drug.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(drug); }}
                onMouseEnter={() => setActiveIdx(i)}
                className={`flex w-full cursor-pointer flex-col gap-[1px] border-0 px-[13px] py-[8px] text-left ${i === activeIdx ? 'bg-[#eff6ff]' : 'bg-transparent hover:bg-[#f8fafc]'}`}
              >
                <span className="text-[13.5px] font-semibold leading-snug" style={{ color: drugNameColor(drug.colorTag) }}>
                  {drug.name}
                </span>
                <span className="text-[11.5px] text-[#94a3b8]">
                  {[drug.genericName, drug.strength, drug.unit].filter(Boolean).join(' · ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const drugInputClass =
  'w-full rounded-[10px] border border-[#cbd5e1] px-[12px] py-[10px] text-[13.5px] text-[#0f172a] outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,.14)]';

type FieldProps = {
  label: string;
  required?: boolean;
  children: React.ReactNode;
};

function Field({ label, required, children }: FieldProps) {
  return (
    <div>
      <label className="mb-[6px] block text-[12.5px] font-semibold text-[#475569]">{label} {required && <span className="text-[#e11d48]">*</span>}</label>
      {children}
    </div>
  );
}

type DrugFieldProps = {
  label: string;
  className: string;
  children: React.ReactNode;
};

function DrugField({ label, className, children }: DrugFieldProps) {
  return <div className={className}><label className="mb-[5px] block text-[11.5px] font-semibold text-[#64748b]">{label}</label>{children}</div>;
}
