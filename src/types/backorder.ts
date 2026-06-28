export type TicketStatus = 'preparing' | 'ready' | 'picked_up' | 'cancelled';

export type StaffRole = 'admin' | 'sub-admin' | 'staff';

export type StaffUser = {
  id?: string;
  name: string;
  prefix?: string;
  firstName?: string;
  lastName?: string;
  role: StaffRole | string;
  username?: string;
};

export type BackorderItemInput = {
  drugName: string;
  qty: number;
  unit: string;
  note?: string;
};

export type CreateBackorderTicketInput = {
  patientName: string;
  hn?: string;
  phone: string;
  note?: string;
  items: BackorderItemInput[];
};

export type UpdateTicketStatusInput = {
  ticketId: string;
  status: TicketStatus;
  reason?: string;
};

export type TicketItem = {
  id: string;
  name: string;
  qty: number | string;
  unit: string;
  note: string;
  status: TicketStatus;
};

export type Ticket = {
  id: string;
  no: string;
  hn: string;
  name: string;
  phone: string;
  note: string;
  status: TicketStatus;
  createdAt: number;
  updatedAt: number;
  token: string;
  readyAt?: string | null;
  pickedUpAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string;
  items: TicketItem[];
  publicOnly?: boolean;
  publicMessage?: string;
};

export type TicketFormItem = {
  id: string;
  name: string;
  qty: string;
  unit: string;
  note: string;
};

export type TicketForm = {
  hn: string;
  name: string;
  phone: string;
  note: string;
  items: TicketFormItem[];
};

export type PublicTicketStatus = {
  found: boolean;
  ticketNo?: string;
  status?: TicketStatus;
  statusText?: string;
  itemsCount?: number;
  updatedAt?: string;
  readyAt?: string | null;
  pickedUpAt?: string | null;
  message?: string;
};

export type CreateTicketResult = {
  id: string;
  ticket_no?: string;
  ticketNo?: string;
  public_token?: string;
  publicToken?: string;
  status: TicketStatus;
  statusUrl: string;
};
