import { useEffect, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { listTickets } from '../services/ticketService';
import type { Ticket } from '../types/backorder';

export function useTickets(enabled = true) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(enabled && isSupabaseConfigured);
  const [error, setError] = useState<Error | null>(null);

  async function reload(): Promise<Ticket[]> {
    if (!enabled || !isSupabaseConfigured) return tickets;
    setLoading(true);
    setError(null);
    try {
      const data = await listTickets();
      setTickets(data);
      return data;
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error(String(cause));
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured) return;
    void reload();
  }, [enabled]);

  return { tickets, setTickets, loading, error, reload };
}
