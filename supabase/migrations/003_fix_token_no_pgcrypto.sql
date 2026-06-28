-- Replace gen_random_bytes (requires pgcrypto) with gen_random_uuid() (built-in since PG13)
create or replace function public.random_public_token()
returns text
language sql
volatile
as $$
  select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
$$;
