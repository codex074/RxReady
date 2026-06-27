import type { FormEvent } from 'react';
import { Icon } from '../components/Icon';
import { uscLogo } from '../uiAssets';

type LookupPageProps = {
  ticketNo: string;
  phoneLast4: string;
  loading: boolean;
  onTicketNoChange: (value: string) => void;
  onPhoneLast4Change: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onLogin: () => void;
};

export function LookupPage({
  ticketNo,
  phoneLast4,
  loading,
  onTicketNoChange,
  onPhoneLast4Change,
  onSubmit,
  onLogin,
}: LookupPageProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[linear-gradient(180deg,#eef4fb_0%,#dbe9fb_100%)] px-[18px] py-[36px]">
      <div className="animate-fade-up mb-[24px] flex flex-col items-center gap-[8px]">
        <img src={uscLogo} alt="USC+" className="h-[46px]" />
        <div className="text-center text-[13px] text-[#64748b]">ศูนย์การแพทย์เฉพาะทางและตรวจสุขภาพ อุตรดิตถ์</div>
      </div>
      <div className="animate-fade-up-slow w-full max-w-[440px] rounded-[22px] border border-[#e2e8f0] bg-white px-[28px] py-[30px] shadow-[0_20px_46px_-28px_rgba(15,42,90,.45)]">
        <h1 className="mb-[8px] text-center text-[23px] font-bold text-[#0f172a]">ตรวจสอบสถานะยา</h1>
        <p className="mb-[24px] text-center text-[14px] leading-[1.6] text-[#64748b]">กรอกเลขที่ใบค้างยาและเบอร์โทร 4 หลักท้าย<br />เพื่อตรวจสอบสถานะยาของท่าน</p>
        <form onSubmit={onSubmit}>
          <label className="mb-[7px] block text-[14px] font-semibold text-[#334155]">เลขที่ใบค้างยา</label>
          <input value={ticketNo} onChange={(event) => onTicketNoChange(event.target.value)} placeholder="เช่น BO-20260627-0049" className="mb-[18px] w-full rounded-[13px] border border-[#cbd5e1] px-[15px] py-[14px] text-[16px] text-[#0f172a] outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,.16)]" />
          <label className="mb-[7px] block text-[14px] font-semibold text-[#334155]">เบอร์โทร 4 หลักท้าย</label>
          <input value={phoneLast4} onChange={(event) => onPhoneLast4Change(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="เช่น 4567" inputMode="numeric" maxLength={4} className="mb-[24px] w-full rounded-[13px] border border-[#cbd5e1] px-[15px] py-[14px] text-[16px] tracking-[.2em] tabular-nums text-[#0f172a] outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,.16)]" />
          <button type="submit" disabled={loading} className="flex w-full cursor-pointer items-center justify-center gap-[9px] rounded-[13px] border-0 bg-[#2563eb] p-[15px] text-[16px] font-bold text-white hover:bg-[#1d4ed8]"><Icon name="search" size={20} />{loading ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสถานะ'}</button>
        </form>
      </div>
      <button onClick={onLogin} className="mt-[20px] cursor-pointer border-0 bg-transparent text-[13.5px] font-semibold text-[#64748b] hover:text-[#2563eb]">สำหรับเจ้าหน้าที่ · เข้าสู่ระบบ →</button>
    </div>
  );
}
