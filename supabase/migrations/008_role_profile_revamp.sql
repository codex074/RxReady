-- 008: Profile name split (display_name -> prefix/f_name/l_name) + role revamp
--   Roles: admin | sub-admin | staff
--   - admin     : manage everything (users, drugs, tickets)
--   - sub-admin : manage drugs + tickets, NOT users
--   - staff     : issue/dispense tickets only

-- 1) Split name columns ------------------------------------------------------
alter table public.profiles
  add column if not exists prefix text not null default '',
  add column if not exists f_name text not null default '',
  add column if not exists l_name text not null default '';

-- Backfill: keep the whole existing display_name as the first name (cannot
-- reliably split prefix/first/last from a single free-text field).
update public.profiles
set f_name = coalesce(nullif(trim(display_name), ''), username, 'เจ้าหน้าที่')
where trim(f_name) = '';

alter table public.profiles drop column if exists display_name;

-- 2) Swap CHECK constraint, THEN remap values --------------------------------
-- Drop the old constraint FIRST: 'sub-admin' is not in the old allowed set, so
-- remapping while it is still active would abort on any existing pharmacist row.
alter table public.profiles drop constraint if exists profiles_role_check;

update public.profiles set role = 'sub-admin' where role = 'pharmacist';
update public.profiles set role = 'staff'     where role = 'viewer';

alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'sub-admin', 'staff'));

-- 3) Permission helpers ------------------------------------------------------
-- sub-admin must count as active staff or RLS locks them out of the whole app.
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
      and role in ('admin', 'sub-admin', 'staff')
  );
$$;

-- admin OR sub-admin: this is where "sub-admin manages drugs" is enforced.
create or replace function public.is_drug_manager()
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
      and role in ('admin', 'sub-admin')
  );
$$;

-- 4) Point drug write policies at the new helper ----------------------------
drop policy if exists drugs_admin_insert on public.drugs;
create policy drugs_admin_insert
  on public.drugs for insert to authenticated
  with check (public.is_drug_manager());

drop policy if exists drugs_admin_update on public.drugs;
create policy drugs_admin_update
  on public.drugs for update to authenticated
  using (public.is_drug_manager())
  with check (public.is_drug_manager());

drop policy if exists drugs_admin_delete on public.drugs;
create policy drugs_admin_delete
  on public.drugs for delete to authenticated
  using (public.is_drug_manager());

-- 5) New-user trigger: insert split name cols + a valid default role --------
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  profile_username text := lower(
    coalesce(
      nullif(new.raw_user_meta_data ->> 'username', ''),
      nullif(split_part(new.email, '@', 1), ''),
      'user-' || left(new.id::text, 8)
    )
  );
begin
  insert into public.profiles (id, username, prefix, f_name, l_name, role, is_active)
  values (
    new.id,
    profile_username,
    coalesce(new.raw_user_meta_data ->> 'prefix', ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'f_name', ''),
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      profile_username
    ),
    coalesce(new.raw_user_meta_data ->> 'l_name', ''),
    'staff',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 6) Self-service profile update (replaces update_own_display_name) ----------
drop function if exists public.update_own_display_name(text);

create or replace function public.update_own_profile(
  new_prefix text,
  new_f_name text,
  new_l_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if trim(new_f_name) = '' then
    raise exception 'กรุณากรอกชื่อ';
  end if;
  update public.profiles
  set prefix = coalesce(trim(new_prefix), ''),
      f_name = trim(new_f_name),
      l_name = coalesce(trim(new_l_name), '')
  where id = auth.uid();
end;
$$;

grant execute on function public.update_own_profile(text, text, text) to authenticated;
