const COLOR_MAP: Record<string, string> = {
  เขียว: '#16a34a',
  แดง: '#dc2626',
  ม่วง: '#9333ea',
  เขียวน้ำเงิน: '#0891b2',
  น้ำเงิน: '#2563eb',
  บานเย็น: '#ec4899',
  '255.128.0': '#ff8000',
  ดำ: '#1e293b',
  เทา: '#64748b',
};

export function drugNameColor(colorTag: string | null | undefined): string {
  return (colorTag && COLOR_MAP[colorTag]) || '#0f172a';
}
