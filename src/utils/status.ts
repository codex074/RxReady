import type { TicketStatus } from '../types/backorder';

export type StatusMeta = {
  key: TicketStatus;
  label: string;
  step: number;
  dot: string;
  text: string;
  bg: string;
  border: string;
  msg: string;
};

export const STATUSES: Record<TicketStatus, StatusMeta> = {
  preparing: {
    key: 'preparing',
    label: 'กำลังเตรียมยา',
    step: 1,
    dot: '#0ea5e9',
    text: '#0369a1',
    bg: '#f0f9ff',
    border: '#bae6fd',
    msg: 'ห้องยากำลังเตรียมยาของท่าน\nกรุณาตรวจสอบสถานะอีกครั้งภายหลัง',
  },
  ready: {
    key: 'ready',
    label: 'พร้อมรับยา',
    step: 2,
    dot: '#10b981',
    text: '#047857',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    msg: 'ยาของท่านพร้อมรับแล้ว\nกรุณาติดต่อรับยาที่ห้องยาในเวลาทำการ',
  },
  picked_up: {
    key: 'picked_up',
    label: 'รับยาแล้ว',
    step: 3,
    dot: '#64748b',
    text: '#475569',
    bg: '#f8fafc',
    border: '#e2e8f0',
    msg: 'รายการนี้ถูกรับยาเรียบร้อยแล้ว',
  },
  cancelled: {
    key: 'cancelled',
    label: 'ยกเลิก',
    step: 0,
    dot: '#f43f5e',
    text: '#be123c',
    bg: '#fff1f2',
    border: '#fecdd3',
    msg: 'รายการใบค้างยานี้ถูกยกเลิก\nกรุณาติดต่อห้องยา หากมีข้อสงสัย',
  },
};

export const STAFF_STATUS_ORDER: TicketStatus[] = ['preparing', 'ready', 'picked_up'];
export const PUBLIC_TIMELINE_ORDER: TicketStatus[] = ['preparing', 'ready', 'picked_up'];

export function normalizeStatus(status: string): TicketStatus {
  return status in STATUSES ? (status as TicketStatus) : 'preparing';
}
