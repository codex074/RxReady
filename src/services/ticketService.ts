import { requireSupabase } from '../lib/supabase';
import type {
  CreateBackorderTicketInput,
  CreateTicketResult,
  PublicTicketStatus,
  Ticket,
  TicketStatus,
} from '../types/backorder';
import type { BackorderTicketWithItems } from '../types/database';
import { normalizeStatus } from '../utils/status';

function toMs(value?: string | null): number {
  return value ? new Date(value).getTime() : Date.now();
}

export function mapTicket(row: BackorderTicketWithItems): Ticket {
  return {
    id: row.id,
    no: row.ticket_no,
    hn: row.hn || '-',
    name: row.patient_name,
    phone: row.phone,
    note: row.note || '',
    status: normalizeStatus(row.status),
    createdAt: toMs(row.created_at),
    updatedAt: toMs(row.updated_at),
    token: row.public_token,
    readyAt: row.ready_at,
    pickedUpAt: row.picked_up_at,
    cancelledAt: row.cancelled_at,
    cancelReason: row.cancel_reason || '',
    items: (row.backorder_items || []).map((item) => ({
      id: item.id,
      name: item.drug_name,
      qty: Number(item.qty),
      unit: item.unit,
      note: item.note || '',
      status: normalizeStatus(row.status),
    })),
  };
}

function mapPublicStatus(row: PublicTicketStatus): Ticket | null {
  if (!row || row.found === false || !row.ticketNo || !row.status) return null;
  const status = normalizeStatus(row.status);

  return {
    id: row.ticketNo,
    no: row.ticketNo,
    hn: '-',
    name: '',
    phone: '-',
    note: '',
    status,
    createdAt: toMs(row.updatedAt),
    updatedAt: toMs(row.updatedAt),
    token: '',
    readyAt: row.readyAt || null,
    pickedUpAt: row.pickedUpAt || null,
    items: Array.from({ length: Number(row.itemsCount || 0) }, (_, index) => ({
      id: String(index + 1),
      name: '',
      qty: '',
      unit: '',
      note: '',
      status,
    })),
    publicOnly: true,
    publicMessage: row.message || '',
  };
}

export async function listTickets(): Promise<Ticket[]> {
  const result = await requireSupabase()
    .from('backorder_tickets')
    .select('*, backorder_items(*)')
    .order('created_at', { ascending: false });

  if (result.error) throw result.error;
  return ((result.data || []) as BackorderTicketWithItems[]).map(mapTicket);
}

export async function createTicket(
  input: CreateBackorderTicketInput,
): Promise<CreateTicketResult> {
  const result = await requireSupabase().rpc('create_backorder_ticket', {
    payload: {
      patientName: input.patientName,
      hn: input.hn || null,
      phone: input.phone,
      note: input.note || null,
      items: input.items.map((item) => ({
        drugName: item.drugName,
        qty: Number(item.qty),
        unit: item.unit,
        note: item.note || null,
      })),
    },
  });

  if (result.error) throw result.error;
  return result.data as CreateTicketResult;
}

export async function updateStatus(
  ticketId: string,
  status: TicketStatus,
  reason?: string,
): Promise<void> {
  const result = await requireSupabase().rpc('update_ticket_status', {
    payload: { ticketId, status, reason: reason || null },
  });

  if (result.error) throw result.error;
}

export async function getPublicStatusByToken(token: string): Promise<Ticket | null> {
  const result = await requireSupabase().rpc('get_public_status_by_token', { token });
  if (result.error) throw result.error;
  return mapPublicStatus(result.data as PublicTicketStatus);
}

export async function lookupTicketStatus(
  ticketNo: string,
  phoneLast4: string,
): Promise<Ticket | null> {
  const result = await requireSupabase().rpc('lookup_ticket_status', {
    ticket_no: ticketNo,
    phone_last4: phoneLast4,
  });
  if (result.error) throw result.error;
  return mapPublicStatus(result.data as PublicTicketStatus);
}
