-- Phase 2: scan engine — storage bucket, baseline run linkage, atomic helpers.

-- Private screenshots bucket. Served only via short-lived signed URLs.
insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', false)
on conflict (id) do nothing;

-- Link baseline rows to the scan (trigger_type='baseline') that produced them
-- so progress UIs can list exactly this run's captures.
alter table baselines add column scan_id uuid references scans(id) on delete set null;
create index idx_baselines_scan on baselines (scan_id);

-- Atomically make one baseline row the current one for its page.
-- The one_current_baseline partial unique index stays satisfied because the
-- old row is cleared before the new one is set, inside one transaction.
create function public.set_current_baseline(p_page_id uuid, p_baseline_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update baselines set is_current = false
    where page_id = p_page_id and is_current and id <> p_baseline_id;
  update baselines set is_current = true, status = 'complete'
    where id = p_baseline_id and page_id = p_page_id;
end;
$$;

-- Concurrency-safe progress counter (two pages can finish at once).
create function public.increment_scan_pages_done(p_scan_id uuid)
returns void
language sql
security definer set search_path = public
as $$
  update scans set pages_done = pages_done + 1 where id = p_scan_id;
$$;

-- Worker calls these with the service role; keep them away from clients.
revoke execute on function public.set_current_baseline(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.increment_scan_pages_done(uuid) from public, anon, authenticated;
