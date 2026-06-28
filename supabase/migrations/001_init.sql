create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  role text not null check (role in ('admin', 'pharmacist', 'staff', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.backorder_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_no text unique not null,
  public_token text unique not null,
  patient_name text not null,
  hn text,
  phone text not null,
  phone_last4 text not null,
  status text not null check (status in ('preparing', 'ready', 'picked_up', 'cancelled')),
  note text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ready_at timestamptz,
  ready_by uuid references public.profiles(id),
  picked_up_at timestamptz,
  picked_up_by uuid references public.profiles(id),
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id),
  cancel_reason text
);

create table if not exists public.backorder_items (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.backorder_tickets(id) on delete cascade,
  drug_name text not null,
  qty numeric not null check (qty > 0),
  unit text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.backorder_tickets(id) on delete set null,
  ticket_no text,
  action text not null,
  old_status text,
  new_status text,
  actor_id uuid,
  actor_type text not null check (actor_type in ('staff', 'patient', 'system')),
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_backorder_tickets_created_at on public.backorder_tickets(created_at desc);
create index if not exists idx_backorder_tickets_updated_at on public.backorder_tickets(updated_at desc);
create index if not exists idx_backorder_tickets_status on public.backorder_tickets(status);
create index if not exists idx_backorder_tickets_lookup on public.backorder_tickets(ticket_no, phone_last4);
create index if not exists idx_backorder_tickets_public_token on public.backorder_tickets(public_token);
create index if not exists idx_backorder_items_ticket_id on public.backorder_items(ticket_id);
create index if not exists idx_audit_logs_ticket_id_created_at on public.audit_logs(ticket_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists backorder_tickets_touch_updated_at on public.backorder_tickets;
create trigger backorder_tickets_touch_updated_at
before update on public.backorder_tickets
for each row execute function public.touch_updated_at();

drop trigger if exists backorder_items_touch_updated_at on public.backorder_items;
create trigger backorder_items_touch_updated_at
before update on public.backorder_items
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, display_name, email, role, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email, 'New user'),
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'viewer'),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active = true;
$$;

create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active = true
      and role in ('admin', 'pharmacist', 'staff')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active = true
      and role = 'admin'
  );
$$;

create or replace function public.assert_active_staff()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  user_id uuid := auth.uid();
begin
  if user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if not public.is_active_staff() then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  return user_id;
end;
$$;

create or replace function public.status_text(status_value text)
returns text
language sql
immutable
as $$
  select case status_value
    when 'preparing' then 'กำลังเตรียมยา'
    when 'ready' then 'พร้อมรับยา'
    when 'picked_up' then 'รับยาแล้ว'
    when 'cancelled' then 'ยกเลิก'
    else 'ไม่ทราบสถานะ'
  end;
$$;

create or replace function public.public_status_message(status_value text)
returns text
language sql
immutable
as $$
  select case status_value
    when 'preparing' then 'ห้องยากำลังเตรียมยาของท่าน กรุณาตรวจสอบสถานะอีกครั้งภายหลัง'
    when 'ready' then 'ยาของท่านพร้อมรับแล้ว กรุณาติดต่อรับยาที่ห้องยาในเวลาทำการ'
    when 'picked_up' then 'รายการนี้ถูกรับยาเรียบร้อยแล้ว'
    when 'cancelled' then 'รายการใบค้างรับยานี้ถูกยกเลิก กรุณาติดต่อห้องยา หากมีข้อสงสัย'
    else 'ไม่พบสถานะ'
  end;
$$;

create or replace function public.random_public_token()
returns text
language sql
volatile
as $$
  select rtrim(translate(encode(gen_random_bytes(24), 'base64'), '+/', '-_'), '=');
$$;

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
    where ticket_no like ('BO-' || day_key || '-%');

  new_ticket_no := 'BO-' || day_key || '-' || lpad(next_no::text, 4, '0');
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
    patient_name,
    patient_hn,
    patient_phone,
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

    insert into public.backorder_items (ticket_id, drug_name, qty, unit, note)
    values (
      ticket_id,
      btrim(item ->> 'drugName'),
      (item ->> 'qty')::numeric,
      btrim(coalesce(nullif(item ->> 'unit', ''), 'หน่วย')),
      nullif(btrim(coalesce(item ->> 'note', '')), '')
    );
  end loop;

  insert into public.audit_logs (ticket_id, ticket_no, action, new_status, actor_id, actor_type, detail)
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

  select status, ticket_no
    into old_status, target_ticket_no
    from public.backorder_tickets
    where id = target_ticket_id
    for update;

  if target_ticket_no is null then
    raise exception 'ticket not found' using errcode = 'P0002';
  end if;

  update public.backorder_tickets
  set status = next_status,
      updated_by = actor,
      ready_at = case when next_status = 'ready' and ready_at is null then now() else ready_at end,
      ready_by = case when next_status = 'ready' then actor else ready_by end,
      picked_up_at = case when next_status = 'picked_up' and picked_up_at is null then now() else picked_up_at end,
      picked_up_by = case when next_status = 'picked_up' then actor else picked_up_by end,
      cancelled_at = case when next_status = 'cancelled' and cancelled_at is null then now() else cancelled_at end,
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
    jsonb_build_object('reason', reason)
  );

  return jsonb_build_object(
    'id', target_ticket_id,
    'ticket_no', target_ticket_no,
    'ticketNo', target_ticket_no,
    'oldStatus', old_status,
    'status', next_status
  );
end;
$$;

create or replace function public.ticket_public_status(t public.backorder_tickets)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'found', true,
    'ticketNo', t.ticket_no,
    'status', t.status,
    'statusText', public.status_text(t.status),
    'itemsCount', (
      select count(*)::integer from public.backorder_items i where i.ticket_id = t.id
    ),
    'updatedAt', t.updated_at,
    'readyAt', t.ready_at,
    'pickedUpAt', t.picked_up_at,
    'message', public.public_status_message(t.status)
  );
$$;

create or replace function public.get_public_status_by_token(token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ticket public.backorder_tickets;
  result jsonb;
begin
  select *
    into ticket
    from public.backorder_tickets
    where public_token = token;

  if ticket.id is null then
    return jsonb_build_object('found', false, 'message', 'ไม่พบข้อมูลใบค้างรับยา');
  end if;

  result := public.ticket_public_status(ticket);

  insert into public.audit_logs (ticket_id, ticket_no, action, actor_type, detail)
  values (ticket.id, ticket.ticket_no, 'public_status_view', 'patient', jsonb_build_object('by', 'token'));

  return result;
end;
$$;

create or replace function public.lookup_ticket_status(ticket_no text, phone_last4 text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ticket public.backorder_tickets;
  result jsonb;
begin
  if btrim(coalesce(ticket_no, '')) = '' or phone_last4 !~ '^\d{4}$' then
    return jsonb_build_object('found', false, 'message', 'ไม่พบข้อมูลใบค้างรับยา');
  end if;

  select *
    into ticket
    from public.backorder_tickets
    where lower(backorder_tickets.ticket_no) = lower(btrim(lookup_ticket_status.ticket_no))
      and backorder_tickets.phone_last4 = lookup_ticket_status.phone_last4;

  if ticket.id is null then
    return jsonb_build_object('found', false, 'message', 'ไม่พบข้อมูลใบค้างรับยา');
  end if;

  result := public.ticket_public_status(ticket);

  insert into public.audit_logs (ticket_id, ticket_no, action, actor_type, detail)
  values (ticket.id, ticket.ticket_no, 'lookup_status', 'patient', jsonb_build_object('by', 'ticket_no_phone_last4'));

  return result;
end;
$$;

alter table public.profiles enable row level security;
alter table public.backorder_tickets enable row level security;
alter table public.backorder_items enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin
on public.profiles
for insert
to authenticated
with check (public.is_admin());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists tickets_staff_select on public.backorder_tickets;
create policy tickets_staff_select
on public.backorder_tickets
for select
to authenticated
using (public.is_active_staff());

drop policy if exists tickets_staff_insert on public.backorder_tickets;
create policy tickets_staff_insert
on public.backorder_tickets
for insert
to authenticated
with check (public.is_active_staff());

drop policy if exists tickets_staff_update on public.backorder_tickets;
create policy tickets_staff_update
on public.backorder_tickets
for update
to authenticated
using (public.is_active_staff())
with check (public.is_active_staff());

drop policy if exists items_staff_select on public.backorder_items;
create policy items_staff_select
on public.backorder_items
for select
to authenticated
using (public.is_active_staff());

drop policy if exists items_staff_insert on public.backorder_items;
create policy items_staff_insert
on public.backorder_items
for insert
to authenticated
with check (public.is_active_staff());

drop policy if exists items_staff_update on public.backorder_items;
create policy items_staff_update
on public.backorder_items
for update
to authenticated
using (public.is_active_staff())
with check (public.is_active_staff());

drop policy if exists audit_logs_staff_select on public.audit_logs;
create policy audit_logs_staff_select
on public.audit_logs
for select
to authenticated
using (public.is_active_staff());

revoke all on public.profiles from anon, authenticated;
revoke all on public.backorder_tickets from anon, authenticated;
revoke all on public.backorder_items from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.backorder_tickets to authenticated;
grant select, insert, update on public.backorder_items to authenticated;
grant select on public.audit_logs to authenticated;

grant execute on function public.create_backorder_ticket(jsonb) to authenticated;
grant execute on function public.update_ticket_status(jsonb) to authenticated;
grant execute on function public.get_public_status_by_token(text) to anon, authenticated;
grant execute on function public.lookup_ticket_status(text, text) to anon, authenticated;
