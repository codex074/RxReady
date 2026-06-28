-- Change ticket number prefix from BO- to USC-
create or replace function public.create_backorder_ticket(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
  patient_name text := btrim(coalesce(payload ->> 'patientName', ''));
  patient_hn text := nullif(btrim(coalesce(payload ->> 'hn', '')), '');
  patient_phone text := btrim(coalesce(payload ->> 'phone', ''));
  clean_phone text;
  ticket_id uuid;
  new_ticket_no text;
  new_public_token text;
  day_key text := to_char((now() at time zone 'Asia/Bangkok')::date, 'YYYYMMDD');
  next_no integer;
  item jsonb;
begin
  actor := public.assert_active_staff();

  if patient_name = '' then
    raise exception 'patientName is required' using errcode = '22023';
  end if;

  clean_phone := regexp_replace(patient_phone, '\D', '', 'g');
  if length(clean_phone) < 4 then
    raise exception 'phone must contain at least 4 digits' using errcode = '22023';
  end if;

  if jsonb_typeof(payload -> 'items') <> 'array' or jsonb_array_length(payload -> 'items') = 0 then
    raise exception 'items must not be empty' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('backorder-ticket-' || day_key));
  select count(*) + 1
    into next_no
    from public.backorder_tickets
    where ticket_no like ('USC-' || day_key || '-%')
       or ticket_no like ('BO-' || day_key || '-%');

  new_ticket_no := 'USC-' || day_key || '-' || lpad(next_no::text, 4, '0');
  new_public_token := public.random_public_token();

  insert into public.backorder_tickets (
    ticket_no,
    patient_name,
    hn,
    phone,
    phone_last4,
    note,
    status,
    public_token
  ) values (
    new_ticket_no,
    patient_name,
    patient_hn,
    clean_phone,
    right(clean_phone, 4),
    nullif(btrim(coalesce(payload ->> 'note', '')), ''),
    'preparing',
    new_public_token
  ) returning id into ticket_id;

  for item in select * from jsonb_array_elements(payload -> 'items') loop
    insert into public.backorder_items (
      ticket_id,
      drug_name,
      qty,
      unit,
      note
    ) values (
      ticket_id,
      btrim(item ->> 'drugName'),
      (item ->> 'qty')::numeric,
      btrim(coalesce(item ->> 'unit', '')),
      nullif(btrim(coalesce(item ->> 'note', '')), '')
    );
  end loop;

  insert into public.audit_logs (ticket_id, ticket_no, action, new_status, actor_id, actor_type, detail)
  values (
    ticket_id,
    new_ticket_no,
    'created',
    'preparing',
    actor,
    'staff',
    jsonb_build_object('patientName', patient_name, 'hn', patient_hn)
  );

  return jsonb_build_object(
    'id', ticket_id,
    'ticket_no', new_ticket_no,
    'ticketNo', new_ticket_no,
    'public_token', new_public_token,
    'publicToken', new_public_token,
    'status', 'preparing',
    'statusUrl', '/status/' || new_public_token
  );
end;
$$;
