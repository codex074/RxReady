import type { Ticket, TicketStatus } from '../types/backorder';

const now = Date.now();
const minute = 60_000;
const hour = 3_600_000;
const day = 86_400_000;

function ticket(
  no: string,
  hn: string,
  name: string,
  phone: string,
  note: string,
  status: TicketStatus,
  createdAgo: number,
  updatedAgo: number,
  items: Array<[string, number, string]>,
): Ticket {
  return {
    id: no,
    no: `BO-20260627-${no}`,
    hn,
    name,
    phone,
    note,
    status,
    createdAt: now - createdAgo,
    updatedAt: now - updatedAgo,
    token: `demo${no}publictoken`,
    items: items.map(([itemName, qty, unit], index) => ({
      id: `${no}-${index}`,
      name: itemName,
      qty,
      unit,
      note: '',
      status,
      receivedQty: 0,
    })),
  };
}

export const MOCK_TICKETS: Ticket[] = [
  ticket('0051', '0012453', 'สมชาย ใจดี', '0817654329', 'ผู้ป่วยเบาหวาน นัดติดตาม 2 สัปดาห์', 'preparing', 12 * minute, 12 * minute, [['Metformin 500 mg', 60, 'เม็ด'], ['Amlodipine 5 mg', 30, 'เม็ด']]),
  ticket('0050', '0009921', 'มาลี ศรีสุข', '0851122033', '', 'preparing', 35 * minute, 8 * minute, [['Atorvastatin 40 mg', 30, 'เม็ด'], ['Aspirin 81 mg', 30, 'เม็ด'], ['Losartan 50 mg', 30, 'เม็ด']]),
  ticket('0049', '0034510', 'ประเสริฐ มั่งมีทรัพย์', '0861234567', '', 'ready', 2 * hour, 25 * minute, [['Insulin (NPH) 100 IU/ml', 2, 'ขวด'], ['Salbutamol inhaler', 1, 'หลอด']]),
  ticket('0048', '0021188', 'วันเพ็ญ ทองอยู่', '0894455667', '', 'picked_up', 3 * hour, 55 * minute, [['Enalapril 5 mg', 60, 'เม็ด']]),
  ticket('0047', '0040277', 'อนุชา พงษ์เจริญ', '0827788990', 'ยกเลิกตามคำขอผู้ป่วย', 'cancelled', 5 * hour, 2 * hour, [['Warfarin 2 mg', 30, 'เม็ด']]),
  ticket('0046', '0017650', 'กนกวรรณ แสงทอง', '0865432198', '', 'preparing', 6 * hour, 6 * hour, [['Simvastatin 20 mg', 30, 'เม็ด'], ['Hydrochlorothiazide 25 mg', 30, 'เม็ด']]),
  ticket('0045', '0028349', 'บุญมา ใจงาม', '0801239876', '', 'preparing', 26 * hour, 3 * hour, [['Glipizide 5 mg', 60, 'เม็ด']]),
  ticket('0044', '0033102', 'สุดารัตน์ พ่วงพี', '0843216540', '', 'ready', 28 * hour, 90 * minute, [['Omeprazole 20 mg', 28, 'แคปซูล'], ['Vitamin B1-6-12', 30, 'เม็ด']]),
  ticket('0043', '0046820', 'ธีรพงษ์ คงทน', '0871119922', '', 'picked_up', 2 * day, 2 * day - 3 * hour, [['Losartan 50 mg', 30, 'เม็ด']]),
  ticket('0042', '0019004', 'จำเนียร อยู่เย็น', '0856677001', '', 'preparing', 2 * day, 2 * day, [['Metformin 500 mg', 90, 'เม็ด'], ['Atorvastatin 40 mg', 30, 'เม็ด']]),
  ticket('0041', '0051237', 'พิมพ์ใจ รักไทย', '0832244668', '', 'ready', 3 * day, 4 * hour, [['Amlodipine 5 mg', 30, 'เม็ด']]),
];
