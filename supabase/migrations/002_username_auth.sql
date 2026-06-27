alter table public.profiles
add column if not exists username text;

update public.profiles as profile
set username = coalesce(
  nullif(lower(auth_user.raw_user_meta_data ->> 'username'), ''),
  nullif(lower(split_part(auth_user.email, '@', 1)), ''),
  'user-' || left(profile.id::text, 8)
)
from auth.users as auth_user
where auth_user.id = profile.id
  and profile.username is null;

update public.profiles
set username = 'user-' || left(id::text, 8)
where username is null;

alter table public.profiles
alter column username set not null;

create unique index if not exists profiles_username_lower_unique
on public.profiles (lower(username));

alter table public.profiles
drop column if exists email;

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
  insert into public.profiles (id, username, display_name, role, is_active)
  values (
    new.id,
    profile_username,
    coalesce(new.raw_user_meta_data ->> 'display_name', profile_username, 'New user'),
    'viewer',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on column public.profiles.username is
  'Staff-facing login name. Supabase email identities are internal implementation details.';
