-- Lookup all tickets by visit date (Thai timezone) + last 4 digits of phone
-- Returns a jsonb array of ticket statuses (supports multiple tickets in one day)
CREATE OR REPLACE FUNCTION public.lookup_ticket_by_date(visit_date date, phone_last4 text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tickets_arr jsonb;
BEGIN
  IF visit_date IS NULL OR phone_last4 !~ '^\d{4}$' THEN
    RETURN jsonb_build_object('found', false, 'message', 'ข้อมูลไม่ครบถ้วน');
  END IF;

  SELECT jsonb_agg(public.ticket_public_status(t) ORDER BY t.created_at ASC)
    INTO tickets_arr
    FROM public.backorder_tickets t
    WHERE date(t.created_at AT TIME ZONE 'Asia/Bangkok') = visit_date
      AND t.phone_last4 = lookup_ticket_by_date.phone_last4;

  IF tickets_arr IS NULL THEN
    RETURN jsonb_build_object('found', false, 'message', 'ไม่พบข้อมูลใบค้างยา');
  END IF;

  INSERT INTO public.audit_logs (ticket_id, ticket_no, action, actor_type, detail)
  SELECT id, ticket_no, 'lookup_status', 'patient',
    jsonb_build_object('by', 'date_phone_last4', 'date', visit_date::text)
  FROM public.backorder_tickets
  WHERE date(created_at AT TIME ZONE 'Asia/Bangkok') = visit_date
    AND phone_last4 = lookup_ticket_by_date.phone_last4;

  RETURN tickets_arr;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_ticket_by_date(date, text) TO anon, authenticated;
