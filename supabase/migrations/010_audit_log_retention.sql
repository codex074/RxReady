-- 010: Keep application audit logs for three months.
-- The cleanup runs daily at 01:30 Asia/Bangkok (18:30 UTC).

create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.purge_expired_audit_logs()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint;
begin
  delete from public.audit_logs
  where created_at < now() - interval '3 months';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_audit_logs() from public;

-- Remove expired rows immediately when this migration is applied.
select public.purge_expired_audit_logs();

-- pg_cron updates the existing named job instead of creating a duplicate.
select cron.schedule(
  'purge-expired-audit-logs',
  '30 18 * * *',
  'select public.purge_expired_audit_logs();'
);
