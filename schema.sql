-- ProFinder database. Run once in Supabase > SQL Editor.
create table admins(user_id uuid primary key references auth.users on delete cascade);
create function is_admin() returns boolean language sql security definer stable set search_path=public
as $$ select exists(select 1 from admins where user_id=auth.uid()) $$;

create table providers(
  id uuid primary key references auth.users on delete cascade,
  biz text not null check (char_length(biz) between 2 and 80),
  name text not null check (char_length(name) between 2 and 80),
  phone text not null check (phone ~ '^[0-9+ ]{9,16}$'),
  area text not null check (char_length(area) between 2 and 60),
  description text not null check (char_length(description) between 10 and 600),
  status text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  created_at timestamptz default now());
create table provider_categories(
  provider_id uuid references providers on delete cascade,
  category text not null check (char_length(category) between 2 and 40),
  primary key(provider_id,category));
-- Private details: only the owner and admins can ever read these.
create table provider_private(
  provider_id uuid primary key references providers on delete cascade,
  email text, reg_no text not null, ref1 text not null, ref2 text not null,
  doc_path text,
  checks jsonb not null default '{"id":false,"phone":false,"proof":false,"refs":false}');
create table reports(
  id bigint generated always as identity primary key,
  provider_id uuid references providers on delete cascade,
  reason text not null check (char_length(reason) between 5 and 500),
  created_at timestamptz default now());

alter table admins enable row level security;
alter table providers enable row level security;
alter table provider_categories enable row level security;
alter table provider_private enable row level security;
alter table reports enable row level security;

-- Public sees ONLY approved providers.
create policy pub_read on providers for select using (status='approved' or id=auth.uid() or is_admin());
create policy own_insert on providers for insert with check (id=auth.uid() and status='pending');
create policy own_update on providers for update using (id=auth.uid() or is_admin());
create policy admin_delete on providers for delete using (is_admin());
create policy cat_read on provider_categories for select using (
  exists(select 1 from providers p where p.id=provider_id and (p.status='approved' or p.id=auth.uid() or is_admin())));
create policy cat_own on provider_categories for all using (provider_id=auth.uid()) with check (provider_id=auth.uid());
create policy priv_own on provider_private for all using (provider_id=auth.uid() or is_admin()) with check (provider_id=auth.uid() or is_admin());
create policy rep_insert on reports for insert with check (true);
create policy rep_admin on reports for select using (is_admin());
create policy adm_self on admins for select using (user_id=auth.uid());

-- Providers can never change their own status, and any edit to an approved profile sends it back for review.
create function guard_status() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then
    new.status := old.status;
    if old.status='approved' and (new.biz,new.phone,new.area,new.description) is distinct from (old.biz,old.phone,old.area,old.description) then
      new.status := 'pending'; end if;
  end if; return new; end $$;
create trigger guard before update on providers for each row execute function guard_status();
-- Providers cannot tick their own verification checks.
create function guard_checks() returns trigger language plpgsql security definer set search_path=public as $$
begin if not is_admin() then new.checks := old.checks; end if; return new; end $$;
create trigger guard2 before update on provider_private for each row execute function guard_checks();

-- Approval is enforced on the server: all four checks must be ticked.
create function approve_provider(pid uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'admins only'; end if;
  if not (select (checks->>'id')::bool and (checks->>'phone')::bool and (checks->>'proof')::bool and (checks->>'refs')::bool
          from provider_private where provider_id=pid) then raise exception 'all checks must be ticked'; end if;
  update providers set status='approved' where id=pid; end $$;

-- Private storage for ID / proof documents.
insert into storage.buckets(id,name,public) values('docs','docs',false);
create policy docs_up on storage.objects for insert to authenticated with check (bucket_id='docs' and (storage.foldername(name))[1]=auth.uid()::text);
create policy docs_read on storage.objects for select to authenticated using (bucket_id='docs' and ((storage.foldername(name))[1]=auth.uid()::text or is_admin()));
