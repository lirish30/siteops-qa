-- RLS per PRD § 2 Security: every table locked to org membership.
-- The worker uses the service-role key and bypasses RLS.

-- Helper: orgs the current user belongs to. security definer so policies on
-- organization_members itself don't recurse.
create function public.user_org_ids()
returns setof uuid
language sql
security definer set search_path = public
stable
as $$
  select org_id from organization_members where user_id = auth.uid();
$$;

alter table profiles enable row level security;
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table sites enable row level security;
alter table monitored_pages enable row level security;
alter table baselines enable row level security;
alter table scans enable row level security;
alter table page_scan_results enable row level security;
alter table issues enable row level security;
alter table reports enable row level security;
alter table stripe_events enable row level security;  -- no policies: service-role only

-- profiles: user manages own row
create policy profiles_select on profiles for select using (id = auth.uid());
create policy profiles_update on profiles for update using (id = auth.uid());

-- organizations
create policy orgs_select on organizations for select
  using (id in (select public.user_org_ids()));
create policy orgs_insert on organizations for insert
  with check (auth.uid() is not null);
create policy orgs_update on organizations for update
  using (id in (select public.user_org_ids()));
create policy orgs_delete on organizations for delete
  using (id in (select public.user_org_ids()));

-- organization_members: members see their org's rows; users add themselves
create policy members_select on organization_members for select
  using (org_id in (select public.user_org_ids()));
create policy members_insert on organization_members for insert
  with check (user_id = auth.uid());
create policy members_delete on organization_members for delete
  using (user_id = auth.uid());

-- sites: org-scoped
create policy sites_all on sites for all
  using (org_id in (select public.user_org_ids()))
  with check (org_id in (select public.user_org_ids()));

-- children of sites: join through sites to org
create policy pages_all on monitored_pages for all
  using (site_id in (select id from sites where org_id in (select public.user_org_ids())))
  with check (site_id in (select id from sites where org_id in (select public.user_org_ids())));

create policy baselines_all on baselines for all
  using (site_id in (select id from sites where org_id in (select public.user_org_ids())))
  with check (site_id in (select id from sites where org_id in (select public.user_org_ids())));

create policy scans_all on scans for all
  using (site_id in (select id from sites where org_id in (select public.user_org_ids())))
  with check (site_id in (select id from sites where org_id in (select public.user_org_ids())));

create policy results_all on page_scan_results for all
  using (scan_id in (
    select s.id from scans s
    join sites st on st.id = s.site_id
    where st.org_id in (select public.user_org_ids())
  ))
  with check (scan_id in (
    select s.id from scans s
    join sites st on st.id = s.site_id
    where st.org_id in (select public.user_org_ids())
  ));

create policy issues_all on issues for all
  using (scan_id in (
    select s.id from scans s
    join sites st on st.id = s.site_id
    where st.org_id in (select public.user_org_ids())
  ))
  with check (scan_id in (
    select s.id from scans s
    join sites st on st.id = s.site_id
    where st.org_id in (select public.user_org_ids())
  ));

-- reports: org-scoped for authenticated users; anon gets nothing — public
-- report access goes through a service-role endpoint validating share_token.
create policy reports_all on reports for all to authenticated
  using (org_id in (select public.user_org_ids()))
  with check (org_id in (select public.user_org_ids()));

-- Grants: RLS is the row filter, but roles still need table privileges.
-- anon gets none — every anonymous access path goes through service role.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
revoke all on stripe_events from authenticated;  -- webhook ledger is service-role only
grant execute on function public.user_org_ids() to authenticated;

-- Atomic first-run org creation: org + owner membership in one call.
-- security definer because the creator has no membership yet, so plain
-- inserts couldn't read the new row back under RLS.
create function public.create_organization(org_name text)
returns organizations
language plpgsql
security definer set search_path = public
as $$
declare
  new_org organizations;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if exists (select 1 from organization_members where user_id = auth.uid()) then
    raise exception 'already_has_org';
  end if;
  insert into organizations (name) values (org_name) returning * into new_org;
  insert into organization_members (org_id, user_id, role)
  values (new_org.id, auth.uid(), 'owner');
  return new_org;
end;
$$;

grant execute on function public.create_organization(text) to authenticated;
