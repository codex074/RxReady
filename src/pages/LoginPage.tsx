import type { FormEvent } from 'react';
import { mophLogo, uscLogo, utthLogo } from '../uiAssets';

type LoginPageProps = {
  username: string;
  password: string;
  loading: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onLookup: () => void;
};

export function LoginPage({
  username,
  password,
  loading,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  onLookup,
}: LoginPageProps) {
  return (
    <div className="flex min-h-screen flex-wrap">
      <div className="relative hidden flex-[1_1_380px] flex-col justify-between overflow-hidden bg-[linear-gradient(160deg,#1e63c7,#1746a0)] px-[48px] py-[56px] text-white min-[900px]:flex">
        <div className="absolute right-[-160px] top-[-150px] h-[420px] w-[420px] rounded-full border-[60px] border-[rgba(255,255,255,.06)]" />
        <div className="absolute bottom-[40px] left-[-90px] h-[240px] w-[240px] rounded-full bg-[rgba(255,255,255,.05)]" />
        <div className="relative">
          <div className="inline-flex rounded-[16px] bg-white px-[20px] py-[14px] shadow-[0_10px_30px_rgba(0,0,0,.18)]">
            <img src={uscLogo} alt="USC+" className="block h-[52px]" />
          </div>
        </div>
        <div className="relative max-w-[420px]">
          <div className="mb-[14px] text-[13px] font-semibold tracking-[.18em] text-[#bcd4f7]">USC PHARMACY · ระบบใบค้างรับยา</div>
          <h1 className="mb-[16px] text-[34px] font-bold leading-[1.25]">ออกใบค้างรับยา ติดตามสถานะ<br />ตรวจสอบได้ด้วย QR Code</h1>
          <p className="mb-[24px] text-[15px] leading-[1.7] text-[#dbe7fb]">ระบบบริหารจัดการใบค้างรับยาสำหรับห้องยา ศูนย์การแพทย์เฉพาะทางและตรวจสุขภาพ อุตรดิตถ์ (USC+) ช่วยให้เจ้าหน้าที่ออกใบค้างรับยาได้รวดเร็ว และผู้ป่วยตรวจสอบสถานะยาได้เองทุกที่</p>
          <div className="flex flex-col gap-[12px]">
            {['ออกใบค้างรับยาพร้อมเลขที่และ QR อัตโนมัติ', 'อัปเดตสถานะ กำลังเตรียมยา · พร้อมรับ · รับยาแล้ว', 'ผู้ป่วยสแกน QR เพื่อตรวจสอบสถานะได้เอง'].map((text) => (
              <div key={text} className="flex items-center gap-[12px] text-[14.5px] text-[#eaf2fe]"><span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[rgba(255,255,255,.18)]">✓</span>{text}</div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center gap-[14px] pt-[8px]">
          <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[12px] bg-white"><img src={utthLogo} alt="รพ.อุตรดิตถ์" className="h-[36px]" /></div>
          <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[12px] bg-white"><img src={mophLogo} alt="สธ." className="h-[36px]" /></div>
          <div className="text-[12.5px] leading-[1.5] text-[#cfe0f8]">กลุ่มงานเภสัชกรรม โรงพยาบาลอุตรดิตถ์<br />กระทรวงสาธารณสุข</div>
        </div>
      </div>

      <div className="flex flex-[1_1_440px] items-center justify-center px-[24px] py-[40px]">
        <div className="animate-fade-up w-full max-w-[400px]">
          <div className="mb-[28px] text-center">
            <h2 className="mb-[6px] text-[24px] font-bold text-[#0f172a]">ระบบใบค้างรับยาออนไลน์</h2>
            <p className="text-[14px] text-[#64748b]">เข้าสู่ระบบสำหรับเจ้าหน้าที่ห้องยา</p>
          </div>
          <form onSubmit={onSubmit} className="rounded-[20px] border border-[#e2e8f0] bg-white p-[28px] shadow-[0_18px_40px_-24px_rgba(15,42,90,.45)]">
            <label className="mb-[7px] block text-[13.5px] font-semibold text-[#334155]">ชื่อผู้ใช้</label>
            <div className="relative mb-[18px]">
              <span className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[15px] text-[#94a3b8]">👤</span>
              <input type="text" autoComplete="username" value={username} onChange={(event) => onUsernameChange(event.target.value)} placeholder="pha208" className="w-full rounded-[12px] border border-[#cbd5e1] py-[13px] pl-[40px] pr-[14px] text-[14.5px] text-[#0f172a] outline-none transition focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,.16)]" />
            </div>
            <label className="mb-[7px] block text-[13.5px] font-semibold text-[#334155]">รหัสผ่าน</label>
            <div className="relative mb-[24px]">
              <span className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[15px] text-[#94a3b8]">🔒</span>
              <input type="password" autoComplete="current-password" inputMode="numeric" value={password} onChange={(event) => onPasswordChange(event.target.value)} placeholder="••••••••" className="w-full rounded-[12px] border border-[#cbd5e1] py-[13px] pl-[40px] pr-[14px] text-[14.5px] text-[#0f172a] outline-none transition focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,.16)]" />
            </div>
            <button type="submit" disabled={loading} className="w-full cursor-pointer rounded-[12px] border-0 bg-[#2563eb] p-[14px] text-[15px] font-bold text-white transition hover:bg-[#1d4ed8]">{loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</button>
          </form>
          <div className="my-[22px] flex items-center gap-[12px]"><div className="h-px flex-1 bg-[#dbe3ee]" /><span className="text-[12.5px] text-[#94a3b8]">สำหรับผู้ป่วย</span><div className="h-px flex-1 bg-[#dbe3ee]" /></div>
          <button onClick={onLookup} className="flex w-full cursor-pointer items-center justify-center gap-[8px] rounded-[12px] border border-[#bfdbfe] bg-white p-[13px] text-[14.5px] font-semibold text-[#1d4ed8] transition hover:border-[#93c5fd] hover:bg-[#eff6ff]">ตรวจสอบสถานะยาด้วยเลขใบค้างรับยา</button>
          <p className="mt-[24px] text-center text-[12px] text-[#94a3b8]">© USC+ Uttaradit Specialty and Check-up Center</p>
        </div>
      </div>
    </div>
  );
}
