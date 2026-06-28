import { requireSupabase } from '../lib/supabase';
import type { AuditLogEntry } from '../types/audit';
import type { TicketStatus } from '../types/backorder';

export async function listAuditLogs(limit = 200): Promise<AuditLogEntry[]> {
  const result = await requireSupabase().rpc('get_admin_audit_logs', {
    limit_count: limit,
  });

  if (result.error) throw result.error;
  return ((result.data || []) as Array<{
    id: string;
    ticket_id: string | null;
    ticket_no: string | null;
    action: string;
    old_status: TicketStatus | null;
    new_status: TicketStatus | null;
    actor_id: string | null;
    actor_name: string;
    detail: Record<string, unknown> | null;
    created_at: string;
  }>).map((row) => ({
    id: row.id,
    ticketId: row.ticket_id,
    ticketNo: row.ticket_no,
    action: row.action,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    actorId: row.actor_id,
    actorName: row.actor_name,
    detail: row.detail || {},
    createdAt: new Date(row.created_at).getTime(),
  }));
}
