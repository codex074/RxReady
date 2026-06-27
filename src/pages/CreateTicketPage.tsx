import type { TicketForm } from '../types/backorder';
import { Icon } from '../components/Icon';

type CreateTicketPageProps = {
  form: TicketForm;
  loading: boolean;
  onFieldChange: (field: keyof Omit<TicketForm, 'items'>, value: string) => void;
  onItemChange: (itemId: string, field: 'name' | 'qty' | 'unit' | 'note', value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (itemId: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

const inputClass =
  'w-full rounded-[11px] border border-[#cbd5e1] px-[13px] py-[11px] text-[14px] text-[#0f172a] outline-none transition focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,.15)]';

export function CreateTicketPage({
  form,
  loading,
  onFieldChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onCancel,
  onSave,
}: CreateTicketPageProps) {
  return (
    <div className="animate-fade-up max-w-[900px]">
      <button onClick={onCancel} className="mb-[14px] inline-flex cursor-pointer items-center gap-[6px] border-0 bg-transparent p-0 text-[13.5px] font-semibold text-[#64748b] hover:text-[#2563eb]">← กลับหน้าหลัก</button>
      <h1 className="mb-[4px] text-[clamp(20px,3vw,26px)] font-bold text-[#0f172a]">สร้างใบค้างยา</h1>
      <p className="mb-[22px] text-[13.5px] text-[#64748b]">กรอกข้อมูลผู้ป่วยและรายการยาที่ค้าง ระบบจะออกเลขใบค้างยาและ QR Code ให้อัตโนมัติ</p>

      <div className="mb-[16px] rounded-[18px] border border-[#e7eef7] bg-white p-[22px]">
        <h2 className="mb-[3px] text-[16px] font-bold text-[#0f172a]">ข้อมูลผู้ป่วย</h2>
        <p className="text-[12.5px] text-[#94a3b8]">ข้อมูลพื้นฐานสำหรับติดตามใบค้างยา</p>
        <div className="mt-[18px] grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[15px]">
          <Field label="HN" required>
            <input value={form.hn} onChange={(event) => onFieldChange('hn', event.target.value)} placeholder="เช่น 0012453" className={inputClass} />
          </Field>
          <Field label="ชื่อ-สกุลผู้ป่วย" required>
            <input value={form.name} onChange={(event) => onFieldChange('name', event.target.value)} placeholder="เช่น สมชาย ใจดี" className={inputClass} />
          </Field>
          <Field label="เบอร์โทรศัพท์">
            <input value={form.phone} onChange={(event) => onFieldChange('phone', event.target.value)} placeholder="08x-xxx-xxxx" inputMode="tel" className={inputClass} />
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
                <input value={item.name} onChange={(event) => onItemChange(item.id, 'name', event.target.value)} placeholder="เช่น Metformin 500 mg" className={drugInputClass} />
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
        <button onClick={onSave} disabled={loading} className="inline-flex cursor-pointer items-center gap-[8px] rounded-[12px] border-0 bg-[#2563eb] px-[26px] py-[12px] text-[14.5px] font-bold text-white hover:bg-[#1d4ed8]"><Icon name="save" size={18} />{loading ? 'กำลังบันทึก...' : 'บันทึกใบค้างยา'}</button>
      </div>
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
