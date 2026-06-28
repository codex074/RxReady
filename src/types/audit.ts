import type { TicketStatus } from './backorder';

export type AuditLogEntry = {
  id: string;
  ticketId: string | null;
  ticketNo: string | null;
  action: string;
  oldStatus: TicketStatus | null;
  newStatus: TicketStatus | null;
  actorId: string | null;
  actorName: string;
  detail: Record<string, unknown>;
  createdAt: number;
};
