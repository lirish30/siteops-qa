-- SiteOps QA initial schema. DDL per PRD § 3 Data Model.

create table profiles (              -- 1:1 with auth.users
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'trial',              -- trial|freelancer|agency_starter|agency_pro|agency_scale
  billing_status text not null default 'trialing', -- trialing|active|past_due|canceled
  stripe_customer_id text unique,
  stripe_subscription_id text,
  trial_ends_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now()
);

create table organization_members (
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'owner',              -- owner|member (MVP: owner only)
  primary key (org_id, user_id)
);

create table sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  url text not null,                               -- normalized origin, e.g. https://example.com
  wp_detection text not null default 'unknown',    -- detected|not_detected|unknown
  wp_signals jsonb not null default '{}',
  status text not null default 'active',           -- active|archived
  last_scan_at timestamptz,
  created_at timestamptz not null default now()
);

create table monitored_pages (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  url text not null,
  label text,
  page_type text not null default 'other',         -- home|contact|landing|service|about|other
  importance text not null default 'normal',       -- critical|normal
  is_active boolean not null default true,
  ignored_regions jsonb not null default '[]',     -- [{x,y,width,height,viewport:"desktop"|"mobile"}]
  unique (site_id, url)
);

create table baselines (                           -- one row per page capture; latest active per page is "the baseline"
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  page_id uuid not null references monitored_pages(id) on delete cascade,
  is_current boolean not null default true,
  status text not null default 'pending',          -- pending|complete|failed
  desktop_screenshot_path text,
  mobile_screenshot_path text,
  http_status int,
  page_title text,
  meta_description text,
  h1 text,
  canonical_url text,
  html_hash text,                                  -- sha256 of normalized main-content HTML
  console_errors jsonb not null default '[]',
  broken_links jsonb not null default '[]',
  forms jsonb not null default '[]',
  ctas jsonb not null default '[]',
  wp_signals jsonb not null default '{}',
  error_message text,
  created_at timestamptz not null default now()
);

create table scans (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  trigger_type text not null default 'manual',     -- manual|baseline
  status text not null default 'queued',           -- queued|running|complete|failed
  user_note text,
  pages_total int not null default 0,
  pages_done int not null default 0,
  overall_severity text,                           -- critical|high|medium|low|info|pass
  ai_internal_summary text,
  ai_client_summary text,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table page_scan_results (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references scans(id) on delete cascade,
  page_id uuid not null references monitored_pages(id) on delete cascade,
  baseline_id uuid references baselines(id),
  status text not null default 'pending',          -- pending|complete|failed
  http_status int,
  desktop_screenshot_path text,
  mobile_screenshot_path text,
  desktop_diff_path text,
  mobile_diff_path text,
  desktop_diff_ratio real,
  mobile_diff_ratio real,
  metadata_snapshot jsonb not null default '{}',
  console_errors jsonb not null default '[]',
  broken_links jsonb not null default '[]',
  forms jsonb not null default '[]',
  ctas jsonb not null default '[]',
  severity text,
  error_message text,
  created_at timestamptz not null default now()
);

create table issues (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references scans(id) on delete cascade,
  page_id uuid references monitored_pages(id) on delete set null,
  type text not null,                              -- see packages/shared/src/issues.ts
  severity text not null,                          -- critical|high|medium|low|info
  needs_review boolean not null default false,
  title text not null,
  description text not null,
  evidence jsonb not null default '{}',
  recommendation text,
  status text not null default 'open',             -- open|expected|resolved|dismissed
  human_notes text,
  created_at timestamptz not null default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references scans(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  type text not null,                              -- internal|client
  title text not null,
  content jsonb not null,                          -- ordered sections: [{id,heading,body,visible}]
  agency_notes text,
  next_steps text,
  share_token text unique,                         -- null until shared; base64url(24 bytes)
  share_enabled boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table stripe_events (                       -- webhook idempotency ledger
  id text primary key,
  processed_at timestamptz not null default now()
);

-- Indexes per PRD § 3
create unique index one_current_baseline on baselines (page_id) where is_current;
create index idx_sites_org on sites (org_id);
create index idx_pages_site on monitored_pages (site_id) where is_active;
create index idx_scans_site_created on scans (site_id, created_at desc);
create index idx_results_scan on page_scan_results (scan_id);
create index idx_issues_scan_severity on issues (scan_id, severity);
create index idx_reports_share on reports (share_token) where share_enabled;

-- Auto-create a profile row for every new auth user (PRD § 9).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
