import { useEffect, useState } from 'react';
import { configurePatientLookup, importPatientLookupFromConfigIni } from '../services/patientService';
import { Icon } from './Icon';

type PatientLookupSettingsModalProps = {
  onClose: () => void;
  onSaved: () => void;
};

const settingsInputClass =
  'w-full rounded-[10px] border border-[#cbd5e1] px-[12px] py-[10px] text-[13.5px] text-[#0f172a] outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,.14)]';

export function PatientLookupSettingsModal({
  onClose,
  onSaved,
}: PatientLookupSettingsModalProps) {
  const [apiUrl, setApiUrl] = useState('http://172.17.1.70:3000');
  const [patientToken, setPatientToken] = useState('');
  const [hisToken, setHisToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const busy = saving || importing;

  async function handleImport() {
    setError('');
    setImporting(true);
    try {
      const result = await importPatientLookupFromConfigIni();
      if (!result.ok) {
        if (!result.canceled) setError(result.message ?? 'นำเข้าไม่สำเร็จ');
        return;
      }
      setApiUrl(result.apiUrl);
      setPatientToken(result.patientToken);
      setHisToken(result.hisToken);
    } catch {
      setError('นำเข้าไฟล์ config.ini ไม่สำเร็จ');
    } finally {
      setImporting(false);
    }
  }

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, busy]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const result = await configurePatientLookup({ apiUrl, patientToken, hisToken });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setPatientToken('');
      setHisToken('');
      onSaved();
    } catch {
      setError('บันทึกการตั้งค่าไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(15,23,42,.45)] p-[18px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-api-settings-title"
        className="w-full max-w-[560px] rounded-[18px] bg-white p-[22px] shadow-[0_24px_70px_rgba(15,23,42,.25)]"
      >
        <div className="flex items-start justify-between gap-[16px]">
          <div>
            <h2 id="patient-api-settings-title" className="text-[18px] font-bold text-[#0f172a]">
              ตั้งค่า HOSxP Patient API
            </h2>
            <p className="mt-[4px] text-[12.5px] leading-relaxed text-[#64748b]">
              Token จะเข้ารหัสและเก็บเฉพาะในเครื่องนี้ ไม่ถูกส่งไปยัง Supabase
            </p>
          </div>
          <button
            type="button"
            aria-label="ปิดหน้าต่างตั้งค่า"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-[9px] border border-[#e2e8f0] bg-white text-[#64748b] hover:bg-[#f8fafc]"
          >
            <Icon name="x" size={17} />
          </button>
        </div>

        <div className="mt-[16px]">
          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={busy}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-[8px] rounded-[11px] border border-[#bfdbfe] bg-[#eff6ff] px-[14px] py-[10px] text-[13px] font-semibold text-[#1d4ed8] hover:bg-[#dbeafe] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name={importing ? 'refresh' : 'plus-circle'} size={16} />
            {importing ? 'กำลังอ่านไฟล์...' : 'นำเข้าจาก config.ini ของแอป HQ'}
          </button>
          <p className="mt-[6px] text-center text-[11px] text-[#94a3b8]">
            เลือกไฟล์ config.ini จากโฟลเดอร์ของแอป HQ เพื่อกรอก URL และ Token อัตโนมัติ
          </p>
        </div>

        <div className="my-[4px] flex items-center gap-[10px]">
          <div className="h-px flex-1 bg-[#e2e8f0]" />
          <span className="text-[11px] text-[#94a3b8]">หรือกรอกเอง</span>
          <div className="h-px flex-1 bg-[#e2e8f0]" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
          <label className="text-[12.5px] font-semibold text-[#475569]">
            API URL
            <input
              value={apiUrl}
              onChange={(event) => setApiUrl(event.target.value)}
              placeholder="http://172.17.1.70:3000"
              className={`${settingsInputClass} mt-[6px]`}
              autoComplete="off"
              required
            />
          </label>
          <label className="text-[12.5px] font-semibold text-[#475569]">
            Token สำหรับ /api/hosxp/patient
            <input
              type="password"
              value={patientToken}
              onChange={(event) => setPatientToken(event.target.value)}
              className={`${settingsInputClass} mt-[6px]`}
              autoComplete="new-password"
              required
            />
          </label>
          <label className="text-[12.5px] font-semibold text-[#475569]">
            Token สำหรับ /api/hosxp/HIS
            <input
              type="password"
              value={hisToken}
              onChange={(event) => setHisToken(event.target.value)}
              className={`${settingsInputClass} mt-[6px]`}
              autoComplete="new-password"
              required
            />
          </label>

          {error && (
            <p role="alert" className="rounded-[10px] bg-[#fff1f2] px-[12px] py-[9px] text-[12.5px] text-[#be123c]">
              {error}
            </p>
          )}

          <div className="mt-[4px] flex justify-end gap-[10px]">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="cursor-pointer rounded-[10px] border border-[#cbd5e1] bg-white px-[17px] py-[10px] text-[13.5px] font-semibold text-[#475569] hover:bg-[#f8fafc]"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex cursor-pointer items-center gap-[7px] rounded-[10px] border-0 bg-[#2563eb] px-[18px] py-[10px] text-[13.5px] font-bold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="save" size={16} />
              {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
