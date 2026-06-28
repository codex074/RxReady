-- 009: Complete staff attribution and audit trail
-- Covers ticket creation/status changes and drug catalogue create/update/delete.

create index if not exists idx_audit_logs_actor_id_created_at
  on public.audit_logs(actor_id, created_at desc);

create index if not exists idx_audit_logs_created_at
  on public.audit_logs(created_at);

-- Audit data is visible to administrators only. Writes still happen through
-- security-definer RPCs and Edge Functions, never from the frontend directly.
drop policy if exists audit_logs_staff_select on public.audit_logs;
drop policy if exists audit_logs_admin_select on public.audit_logs;
create policy audit_logs_admin_select
  on public.audit_logs
  for select
  to authenticated
  using (public.is_admin());

-- Normalize the action name used by migration 004.
update public.audit_logs
set action = 'create_ticket'
where action = 'created';

-- Recover creator/updater attribution for existing tickets where possible.
with first_ticket_actor as (
  select distinct on (ticket_id)
    ticket_id,
    actor_id
  from public.audit_logs
  where ticket_id is not null
    and actor_id is not null
    and action = 'create_ticket'
  order by ticket_id, created_at asc
)
update public.backorder_tickets as ticket
set created_by = actor.actor_id
from first_ticket_actor as actor
where ticket.id = actor.ticket_id
  and ticket.created_by is null;

with last_ticket_actor as (
  select distinct on (ticket_id)
    ticket_id,
    actor_id
  from public.audit_logs
  where ticket_id is not null
    and actor_id is not null
    and action in ('create_ticket', 'update_status')
  order by ticket_id, created_at desc
)
update public.backorder_tickets as ticket
set updated_by = actor.actor_id
from last_ticket_actor as actor
where ticket.id = actor.ticket_id
  and ticket.updated_by is null;

create or replace function public.create_backorder_ticket(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
  new_patient_name text := btrim(coalesce(payload ->> 'patientName', ''));
  new_patient_hn text := nullif(btrim(coalesce(payload ->> 'hn', '')), '');
  new_patient_phone text := btrim(coalesce(payload ->> 'phone', ''));
  clean_phone text;
  ticket_id uuid;
  new_ticket_no text;
  new_public_token text;
  day_key text := to_char((now() at time zone 'Asia/Bangkok')::date, 'YYYYMMDD');
  next_no integer;
  item jsonb;
begin
  actor := public.assert_active_staff();

  if new_patient_name = '' then
    raise exception 'patientName is required' using errcode = '22023';
  end if;

  clean_phone := regexp_replace(new_patient_phone, '\D', '', 'g');
  if length(clean_phone) < 4 then
    raise exception 'phone must contain at least 4 digits' using errcode = '22023';
  end if;

  if jsonb_typeof(payload -> 'items') <> 'array'
     or jsonb_array_length(payload -> 'items') = 0 then
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
    public_token,
    patient_name,
    hn,
    phone,
    phone_last4,
    status,
    note,
    created_by,
    updated_by
  )
  values (
    new_ticket_no,
    new_public_token,
    new_patient_name,
    new_patient_hn,
    new_patient_phone,
    right(clean_phone, 4),
    'preparing',
    nullif(btrim(coalesce(payload ->> 'note', '')), ''),
    actor,
    actor
  )
  returning id into ticket_id;

  for item in select * from jsonb_array_elements(payload -> 'items')
  loop
    if btrim(coalesce(item ->> 'drugName', '')) = '' then
      raise exception 'drugName is required' using errcode = '22023';
    end if;
    if coalesce((item ->> 'qty')::numeric, 0) <= 0 then
      raise exception 'qty must be greater than zero' using errcode = '22023';
    end if;
    if btrim(coalesce(item ->> 'unit', '')) = '' then
      raise exception 'unit is required' using errcode = '22023';
    end if;

    insert into public.backorder_items (ticket_id, drug_name, qty, unit, note)
    values (
      ticket_id,
      btrim(item ->> 'drugName'),
      (item ->> 'qty')::numeric,
      btrim(item ->> 'unit'),
      nullif(btrim(coalesce(item ->> 'note', '')), '')
    );
  end loop;

  insert into public.audit_logs (
    ticket_id,
    ticket_no,
    action,
    new_status,
    actor_id,
    actor_type,
    detail
  )
  values (
    ticket_id,
    new_ticket_no,
    'create_ticket',
    'preparing',
    actor,
    'staff',
    jsonb_build_object('itemsCount', jsonb_array_length(payload -> 'items'))
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

create or replace function public.update_ticket_status(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
  target_ticket_id uuid := (payload ->> 'ticketId')::uuid;
  next_status text := payload ->> 'status';
  reason text := nullif(btrim(coalesce(payload ->> 'reason', '')), '');
  old_status text;
  target_ticket_no text;
begin
  actor := public.assert_active_staff();

  if next_status not in ('preparing', 'ready', 'picked_up', 'cancelled') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  if next_status = 'cancelled' and reason is null then
    raise exception 'cancel reason is required' using errcode = '22023';
  end if;

  select status, ticket_no
  into old_status, target_ticket_no
  from public.backorder_tickets
  where id = target_ticket_id
  for update;

  if target_ticket_no is null then
    raise exception 'ticket not found' using errcode = 'P0002';
  end if;

  if old_status = next_status then
    return jsonb_build_object(
      'id', target_ticket_id,
      'ticket_no', target_ticket_no,
      'ticketNo', target_ticket_no,
      'oldStatus', old_status,
      'status', next_status,
      'changed', false
    );
  end if;

  update public.backorder_tickets
  set status = next_status,
      updated_by = actor,
      ready_at = case when next_status = 'ready' then now() else ready_at end,
      ready_by = case when next_status = 'ready' then actor else ready_by end,
      picked_up_at = case when next_status = 'picked_up' then now() else picked_up_at end,
      picked_up_by = case when next_status = 'picked_up' then actor else picked_up_by end,
      cancelled_at = case when next_status = 'cancelled' then now() else cancelled_at end,
      cancelled_by = case when next_status = 'cancelled' then actor else cancelled_by end,
      cancel_reason = case when next_status = 'cancelled' then reason else cancel_reason end
  where id = target_ticket_id;

  insert into public.audit_logs (
    ticket_id,
    ticket_no,
    action,
    old_status,
    new_status,
    actor_id,
    actor_type,
    detail
  )
  values (
    target_ticket_id,
    target_ticket_no,
    'update_status',
    old_status,
    next_status,
    actor,
    'staff',
    case
      when reason is null then '{}'::jsonb
      else jsonb_build_object('reason', reason)
    end
  );

  return jsonb_build_object(
    'id', target_ticket_id,
    'ticket_no', target_ticket_no,
    'ticketNo', target_ticket_no,
    'oldStatus', old_status,
    'status', next_status,
    'changed', true
  );
end;
$$;

create or replace function public.delete_backorder_ticket(target_ticket_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
  target_ticket public.backorder_tickets;
  items_count integer;
begin
  actor := public.assert_active_staff();
  if not public.is_admin() then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  select *
  into target_ticket
  from public.backorder_tickets
  where id = target_ticket_id
  for update;

  if target_ticket.id is null then
    raise exception 'ticket not found' using errcode = 'P0002';
  end if;

  select count(*)::integer
  into items_count
  from public.backorder_items
  where ticket_id = target_ticket_id;

  insert into public.audit_logs (
    ticket_id,
    ticket_no,
    action,
    old_status,
    actor_id,
    actor_type,
    detail
  )
  values (
    target_ticket.id,
    target_ticket.ticket_no,
    'delete_ticket',
    target_ticket.status,
    actor,
    'staff',
    jsonb_build_object('itemsCount', items_count)
  );

  -- backorder_items are removed by ON DELETE CASCADE. audit_logs.ticket_id is
  -- set to null, while ticket_no remains available for the audit history.
  delete from public.backorder_tickets where id = target_ticket_id;
end;
$$;

create or replace function public.update_backorder_ticket(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
  target_ticket_id uuid := (payload ->> 'ticketId')::uuid;
  target_ticket_no text;
  new_patient_name text := btrim(coalesce(payload ->> 'patientName', ''));
  new_patient_hn text := nullif(btrim(coalesce(payload ->> 'hn', '')), '');
  new_patient_phone text := btrim(coalesce(payload ->> 'phone', ''));
  clean_phone text;
  item jsonb;
  target_item_id uuid;
  old_data jsonb;
  new_data jsonb;
begin
  actor := public.assert_active_staff();

  if new_patient_name = '' then
    raise exception 'patientName is required' using errcode = '22023';
  end if;

  clean_phone := regexp_replace(new_patient_phone, '\D', '', 'g');
  if length(clean_phone) < 4 then
    raise exception 'phone must contain at least 4 digits' using errcode = '22023';
  end if;

  if jsonb_typeof(payload -> 'items') <> 'array'
     or jsonb_array_length(payload -> 'items') = 0 then
    raise exception 'items must not be empty' using errcode = '22023';
  end if;

  select
    ticket_no,
    jsonb_build_object(
      'patientName', backorder_tickets.patient_name,
      'hn', backorder_tickets.hn,
      'phoneLast4', backorder_tickets.phone_last4,
      'note', backorder_tickets.note,
      'items', (
        select coalesce(
          jsonb_agg(jsonb_build_object(
            'id', backorder_items.id,
            'drugName', backorder_items.drug_name,
            'qty', backorder_items.qty,
            'unit', backorder_items.unit,
            'note', backorder_items.note
          ) order by backorder_items.created_at),
          '[]'::jsonb
        )
        from public.backorder_items
        where backorder_items.ticket_id = backorder_tickets.id
      )
    )
  into target_ticket_no, old_data
  from public.backorder_tickets
  where id = target_ticket_id
  for update;

  if target_ticket_no is null then
    raise exception 'ticket not found' using errcode = 'P0002';
  end if;

  update public.backorder_tickets
  set patient_name = new_patient_name,
      hn = new_patient_hn,
      phone = new_patient_phone,
      phone_last4 = right(clean_phone, 4),
      note = nullif(btrim(coalesce(payload ->> 'note', '')), ''),
      updated_by = actor
  where id = target_ticket_id;

  delete from public.backorder_items as existing_item
  where existing_item.ticket_id = target_ticket_id
    and not exists (
      select 1
      from jsonb_array_elements(payload -> 'items') as requested_item
      where nullif(requested_item ->> 'itemId', '')::uuid = existing_item.id
    );

  for item in select * from jsonb_array_elements(payload -> 'items')
  loop
    if btrim(coalesce(item ->> 'drugName', '')) = '' then
      raise exception 'drugName is required' using errcode = '22023';
    end if;
    if coalesce((item ->> 'qty')::numeric, 0) <= 0 then
      raise exception 'qty must be greater than zero' using errcode = '22023';
    end if;
    if btrim(coalesce(item ->> 'unit', '')) = '' then
      raise exception 'unit is required' using errcode = '22023';
    end if;

    target_item_id := nullif(item ->> 'itemId', '')::uuid;
    if target_item_id is null then
      insert into public.backorder_items (ticket_id, drug_name, qty, unit, note)
      values (
        target_ticket_id,
        btrim(item ->> 'drugName'),
        (item ->> 'qty')::numeric,
        btrim(item ->> 'unit'),
        nullif(btrim(coalesce(item ->> 'note', '')), '')
      );
    else
      update public.backorder_items
      set drug_name = btrim(item ->> 'drugName'),
          qty = (item ->> 'qty')::numeric,
          unit = btrim(item ->> 'unit'),
          note = nullif(btrim(coalesce(item ->> 'note', '')), '')
      where id = target_item_id
        and ticket_id = target_ticket_id;

      if not found then
        raise exception 'ticket item not found' using errcode = 'P0002';
      end if;
    end if;
  end loop;

  select jsonb_build_object(
    'patientName', backorder_tickets.patient_name,
    'hn', backorder_tickets.hn,
    'phoneLast4', backorder_tickets.phone_last4,
    'note', backorder_tickets.note,
    'items', (
      select coalesce(
        jsonb_agg(jsonb_build_object(
          'id', backorder_items.id,
          'drugName', backorder_items.drug_name,
          'qty', backorder_items.qty,
          'unit', backorder_items.unit,
          'note', backorder_items.note
        ) order by backorder_items.created_at),
        '[]'::jsonb
      )
      from public.backorder_items
      where backorder_items.ticket_id = backorder_tickets.id
    )
  )
  into new_data
  from public.backorder_tickets
  where id = target_ticket_id;

  insert into public.audit_logs (
    ticket_id,
    ticket_no,
    action,
    actor_id,
    actor_type,
    detail
  )
  values (
    target_ticket_id,
    target_ticket_no,
    'update_ticket',
    actor,
    'staff',
    jsonb_build_object('oldData', old_data, 'newData', new_data)
  );
end;
$$;

create or replace function public.create_drug_with_audit(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
  created_drug public.drugs;
begin
  actor := public.assert_active_staff();
  if not public.is_drug_manager() then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  if btrim(coalesce(payload ->> 'name', '')) = '' then
    raise exception 'drug name is required' using errcode = '22023';
  end if;

  insert into public.drugs (
    name,
    generic_name,
    strength,
    unit,
    price,
    color_tag,
    active
  )
  values (
    btrim(payload ->> 'name'),
    btrim(coalesce(payload ->> 'genericName', '')),
    btrim(coalesce(payload ->> 'strength', '')),
    btrim(coalesce(payload ->> 'unit', '')),
    case when payload -> 'price' is null or payload -> 'price' = 'null'::jsonb
      then null else (payload ->> 'price')::numeric end,
    nullif(btrim(coalesce(payload ->> 'colorTag', '')), ''),
    coalesce((payload ->> 'active')::boolean, true)
  )
  returning * into created_drug;

  insert into public.audit_logs (action, actor_id, actor_type, detail)
  values (
    'create_drug',
    actor,
    'staff',
    jsonb_build_object(
      'drugId', created_drug.id,
      'drugName', created_drug.name,
      'newData', to_jsonb(created_drug) - 'created_at' - 'updated_at'
    )
  );

  return to_jsonb(created_drug);
end;
$$;

create or replace function public.update_drug_with_audit(
  target_drug_id uuid,
  payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
  old_drug public.drugs;
  updated_drug public.drugs;
begin
  actor := public.assert_active_staff();
  if not public.is_drug_manager() then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  select *
  into old_drug
  from public.drugs
  where id = target_drug_id
  for update;

  if old_drug.id is null then
    raise exception 'drug not found' using errcode = 'P0002';
  end if;

  update public.drugs
  set name = case when payload ? 'name' then btrim(payload ->> 'name') else name end,
      generic_name = case when payload ? 'genericName'
        then btrim(coalesce(payload ->> 'genericName', '')) else generic_name end,
      strength = case when payload ? 'strength'
        then btrim(coalesce(payload ->> 'strength', '')) else strength end,
      unit = case when payload ? 'unit'
        then btrim(coalesce(payload ->> 'unit', '')) else unit end,
      price = case when payload ? 'price'
        then case when payload -> 'price' = 'null'::jsonb
          then null else (payload ->> 'price')::numeric end
        else price end,
      color_tag = case when payload ? 'colorTag'
        then nullif(btrim(coalesce(payload ->> 'colorTag', '')), '') else color_tag end,
      active = case when payload ? 'active'
        then (payload ->> 'active')::boolean else active end
  where id = target_drug_id
  returning * into updated_drug;

  insert into public.audit_logs (action, actor_id, actor_type, detail)
  values (
    'update_drug',
    actor,
    'staff',
    jsonb_build_object(
      'drugId', updated_drug.id,
      'drugName', updated_drug.name,
      'oldData', to_jsonb(old_drug) - 'created_at' - 'updated_at',
      'newData', to_jsonb(updated_drug) - 'created_at' - 'updated_at'
    )
  );

  return to_jsonb(updated_drug);
end;
$$;

create or replace function public.delete_drug_with_audit(target_drug_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
  old_drug public.drugs;
begin
  actor := public.assert_active_staff();
  if not public.is_drug_manager() then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  select *
  into old_drug
  from public.drugs
  where id = target_drug_id
  for update;

  if old_drug.id is null then
    raise exception 'drug not found' using errcode = 'P0002';
  end if;

  insert into public.audit_logs (action, actor_id, actor_type, detail)
  values (
    'delete_drug',
    actor,
    'staff',
    jsonb_build_object(
      'drugId', old_drug.id,
      'drugName', old_drug.name,
      'oldData', to_jsonb(old_drug) - 'created_at' - 'updated_at'
    )
  );

  delete from public.drugs where id = target_drug_id;
end;
$$;

create or replace function public.get_ticket_audit_history(target_ticket_id uuid)
returns table (
  id uuid,
  action text,
  old_status text,
  new_status text,
  actor_id uuid,
  actor_name text,
  detail jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_active_staff();

  if not exists (
    select 1 from public.backorder_tickets where backorder_tickets.id = target_ticket_id
  ) then
    raise exception 'ticket not found' using errcode = 'P0002';
  end if;

  return query
  select
    log.id,
    log.action,
    log.old_status,
    log.new_status,
    log.actor_id,
    coalesce(
      nullif(btrim(concat_ws(' ', profile.prefix, profile.f_name, profile.l_name)), ''),
      profile.username,
      case log.actor_type
        when 'patient' then 'ผู้ป่วย'
        when 'system' then 'ระบบ'
        else 'ไม่ทราบผู้ดำเนินการ'
      end
    ) as actor_name,
    coalesce(log.detail, '{}'::jsonb) as detail,
    log.created_at
  from public.audit_logs as log
  left join public.profiles as profile on profile.id = log.actor_id
  where log.ticket_id = target_ticket_id
    and log.action in ('create_ticket', 'update_status')
  order by log.created_at desc;
end;
$$;

create or replace function public.get_admin_audit_logs(limit_count integer default 200)
returns table (
  id uuid,
  ticket_id uuid,
  ticket_no text,
  action text,
  old_status text,
  new_status text,
  actor_id uuid,
  actor_name text,
  detail jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_active_staff();
  if not public.is_admin() then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  return query
  select
    log.id,
    log.ticket_id,
    log.ticket_no,
    log.action,
    log.old_status,
    log.new_status,
    log.actor_id,
    coalesce(
      nullif(btrim(concat_ws(' ', profile.prefix, profile.f_name, profile.l_name)), ''),
      profile.username,
      case log.actor_type
        when 'patient' then 'ผู้ป่วย'
        when 'system' then 'ระบบ'
        else 'ไม่ทราบผู้ดำเนินการ'
      end
    ) as actor_name,
    coalesce(log.detail, '{}'::jsonb) as detail,
    log.created_at
  from public.audit_logs as log
  left join public.profiles as profile on profile.id = log.actor_id
  order by log.created_at desc
  limit least(greatest(coalesce(limit_count, 200), 1), 500);
end;
$$;

-- Force ticket/item/catalogue mutations through audited RPCs.
revoke insert, update, delete on public.backorder_tickets from authenticated;
revoke insert, update, delete on public.backorder_items from authenticated;
revoke insert, update, delete on public.drugs from authenticated;

revoke all on function public.create_drug_with_audit(jsonb) from public;
revoke all on function public.update_drug_with_audit(uuid, jsonb) from public;
revoke all on function public.delete_drug_with_audit(uuid) from public;
revoke all on function public.delete_backorder_ticket(uuid) from public;
revoke all on function public.update_backorder_ticket(jsonb) from public;
revoke all on function public.get_ticket_audit_history(uuid) from public;
revoke all on function public.get_admin_audit_logs(integer) from public;

grant execute on function public.create_drug_with_audit(jsonb) to authenticated;
grant execute on function public.update_drug_with_audit(uuid, jsonb) to authenticated;
grant execute on function public.delete_drug_with_audit(uuid) to authenticated;
grant execute on function public.delete_backorder_ticket(uuid) to authenticated;
grant execute on function public.update_backorder_ticket(jsonb) to authenticated;
grant execute on function public.get_ticket_audit_history(uuid) to authenticated;
grant execute on function public.get_admin_audit_logs(integer) to authenticated;
