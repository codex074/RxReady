import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import type { StaffUser } from '../types/backorder';

type Props = {
  user: StaffUser;
  loading: boolean;
  onSave: (prefix: string, firstName: string, lastName: string, newPassword?: string) => Promise<void>;
  onClose: () => void;
};

const inputClass =
  'w-full rounded-[10px] border border-[#e2e8f0] bg-white px-[13px] py-[9px] text-[13.5px] text-[#0f172a] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#dbeafe]';

export function EditProfileModal({ user, loading, onSave, onClose }: Props) {
  const [prefix, setPrefix] = useState(user.prefix || '');
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!firstName.trim()) { setError('กรุณากรอกชื่อ'); return; }
    if (newPassword) {
      if (newPassword.length < 4) { setError('รหัสผ่านต้องมีอย่างน้อย 4 ตัว'); return; }
      if (newPassword !== confirmPassword) { setError('รหัสผ่านยืนยันไม่ตรงกัน'); return; }
    }
    await onSave(prefix.trim(), firstName.trim(), lastName.trim(), newPassword || undefined);
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-[rgba(15,23,42,.55)] px-[16px] py-[48px]">
      <div className="w-full max-w-[440px] rounded-[18px] border border-[#e7eef7] bg-white p-[26px] shadow-[0_20px_60px_-20px_rgba(15,42,90,.45)]">
        <div className="mb-[20px] flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-[#0f172a]">แก้ไขข้อมูลส่วนตัว</h2>
          <button onClick={onClose} className="inline-flex h-[32px] w-[32px] cursor-pointer items-center justify-center rounded-[8px] border-0 bg-transparent text-[#94a3b8] hover:bg-[#f1f5f9]">
            <Icon name="x" size={17} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-[16px]">
          <div>
            <label className="mb-[6px] block text-[12.5px] font-semibold text-[#475569]">
              ชื่อผู้ใช้
            </label>
            <div className="rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] px-[13px] py-[9px] text-[13.5px] text-[#94a3b8]">
              {user.username || '—'}
            </div>
          </div>

          <div>
            <label className="mb-[6px] block text-[12.5px] font-semibold text-[#475569]">
              คำนำหน้า
            </label>
            <input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className={inputClass}
              placeholder="เช่น นาย / นาง / ภก. / ภญ."
            />
          </div>

          <div className="grid grid-cols-2 gap-[12px]">
            <div>
              <label className="mb-[6px] block text-[12.5px] font-semibold text-[#475569]">
                ชื่อ <span className="text-[#e11d48]">*</span>
              </label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClass}
                placeholder="ชื่อ"
                required
              />
            </div>
            <div>
              <label className="mb-[6px] block text-[12.5px] font-semibold text-[#475569]">
                นามสกุล
              </label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
                placeholder="นามสกุล"
              />
            </div>
          </div>

          <div className="border-t border-[#f1f5f9] pt-[4px]">
            <p className="mb-[12px] text-[12px] text-[#94a3b8]">
              เปลี่ยนรหัสผ่าน — เว้นว่างไว้หากไม่ต้องการเปลี่ยน
            </p>
            <div className="flex flex-col gap-[12px]">
              <div>
                <label className="mb-[6px] block text-[12.5px] font-semibold text-[#475569]">
                  รหัสผ่านใหม่
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`${inputClass} pr-[40px]`}
                    placeholder="ขั้นต่ำ 4 ตัว"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-[10px] top-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-[2px] text-[#94a3b8] hover:text-[#475569]"
                  >
                    <Icon name={showNew ? 'eye-off' : 'eye'} size={16} />
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-[6px] block text-[12.5px] font-semibold text-[#475569]">
                  ยืนยันรหัสผ่าน
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`${inputClass} pr-[40px]`}
                    placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-[10px] top-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-[2px] text-[#94a3b8] hover:text-[#475569]"
                  >
                    <Icon name={showConfirm ? 'eye-off' : 'eye'} size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p className="rounded-[8px] bg-[#fff1f2] px-[12px] py-[8px] text-[12.5px] font-semibold text-[#e11d48]">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-[10px] pt-[4px]">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-[10px] border border-[#e2e8f0] bg-white px-[18px] py-[9px] text-[13.5px] font-semibold text-[#475569] hover:bg-[#f8fafc]"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="cursor-pointer rounded-[10px] border-0 bg-[#2563eb] px-[18px] py-[9px] text-[13.5px] font-bold text-white disabled:opacity-50 hover:bg-[#1d4ed8]"
            >
              {loading ? 'กำลังบันทึก…' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
