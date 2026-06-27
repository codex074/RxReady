import { useState } from 'react';
import { createTicket, updateStatus } from '../services/ticketService';
import type {
  CreateBackorderTicketInput,
  CreateTicketResult,
  TicketStatus,
} from '../types/backorder';

export function useTicketActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function run<T>(action: () => Promise<T>): Promise<T> {
    setLoading(true);
    setError(null);
    try {
      return await action();
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error(String(cause));
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    error,
    createTicket: (input: CreateBackorderTicketInput): Promise<CreateTicketResult> =>
      run(() => createTicket(input)),
    updateStatus: (ticketId: string, status: TicketStatus, reason?: string): Promise<void> =>
      run(() => updateStatus(ticketId, status, reason)),
  };
}
