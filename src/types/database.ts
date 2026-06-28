import type { TicketStatus } from './backorder';

export type ProfileRow = {
  id: string;
  username: string;
  prefix: string;
  f_name: string;
  l_name: string;
  role: 'admin' | 'sub-admin' | 'staff';
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type BackorderTicketRow = {
  id: string;
  ticket_no: string;
  public_token: string;
  patient_name: string;
  hn: string | null;
  phone: string;
  phone_last4: string;
  status: TicketStatus;
  note: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  ready_at: string | null;
  ready_by: string | null;
  picked_up_at: string | null;
  picked_up_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
};

export type BackorderItemRow = {
  id: string;
  ticket_id: string;
  drug_name: string;
  qty: number;
  unit: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type BackorderTicketWithItems = BackorderTicketRow & {
  backorder_items: BackorderItemRow[];
};

export type AuditLogRow = {
  id: string;
  ticket_id: string | null;
  ticket_no: string | null;
  action: string;
  old_status: TicketStatus | null;
  new_status: TicketStatus | null;
  actor_id: string | null;
  actor_type: 'staff' | 'patient' | 'system';
  detail: Record<string, unknown> | null;
  created_at: string;
};
