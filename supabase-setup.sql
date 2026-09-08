-- LĐBC CMS: run in a separate Supabase project or alongside unrelated tables.
-- No service_role key in the application. Only explicitly granted admins can write.
begin;
create extension if not exists pgcrypto;
create table if not exists public.ldbc_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.ldbc_admins enable row level security;
drop policy if exists "Admin reads own membership" on public.ldbc_admins;
create policy "Admin reads own membership" on public.ldbc_admins for select to authenticated using (user_id=auth.uid());
revoke all on public.ldbc_admins from anon,authenticated;
grant select on public.ldbc_admins to authenticated;
create table if not exists public.ldbc_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 240),
  slug text unique not null check (length(slug)<=180 and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  category text not null,
  excerpt text not null default '' check (length(excerpt)<=600),
  body jsonb not null check (jsonb_typeof(body)='array' and jsonb_array_length(body) between 1 and 100),
  cover_url text not null default '',
  status text not null default 'draft' check (status in ('draft','published','trash')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_date_required check (status<>'published' or published_at is not null)
);
create index if not exists ldbc_posts_public_order on public.ldbc_posts(status,published_at desc);
create table if not exists public.ldbc_site_content (
  id text primary key, value text not null check (length(value)<=10000), updated_at timestamptz not null default now()
);
create or replace function public.ldbc_touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=clock_timestamp();return new;end $$;
drop trigger if exists ldbc_posts_updated on public.ldbc_posts;
create trigger ldbc_posts_updated before update on public.ldbc_posts for each row execute function public.ldbc_touch_updated_at();
drop trigger if exists ldbc_content_updated on public.ldbc_site_content;
create trigger ldbc_content_updated before update on public.ldbc_site_content for each row execute function public.ldbc_touch_updated_at();
alter table public.ldbc_posts enable row level security;
alter table public.ldbc_site_content enable row level security;
revoke all on public.ldbc_posts,public.ldbc_site_content from anon,authenticated;
grant select on public.ldbc_posts,public.ldbc_site_content to anon,authenticated;
grant insert,update on public.ldbc_posts to authenticated;
grant update on public.ldbc_site_content to authenticated;
drop policy if exists "Read public posts" on public.ldbc_posts;
create policy "Read public posts" on public.ldbc_posts for select using (status='published' and published_at<=now());
drop policy if exists "Admins read posts" on public.ldbc_posts;
create policy "Admins read posts" on public.ldbc_posts for select to authenticated using (exists(select 1 from public.ldbc_admins where user_id=auth.uid()));
drop policy if exists "Admins insert posts" on public.ldbc_posts;
create policy "Admins insert posts" on public.ldbc_posts for insert to authenticated with check (exists(select 1 from public.ldbc_admins where user_id=auth.uid()));
drop policy if exists "Admins update posts" on public.ldbc_posts;
create policy "Admins update posts" on public.ldbc_posts for update to authenticated using (exists(select 1 from public.ldbc_admins where user_id=auth.uid())) with check (exists(select 1 from public.ldbc_admins where user_id=auth.uid()));
drop policy if exists "Read homepage content" on public.ldbc_site_content;
create policy "Read homepage content" on public.ldbc_site_content for select using(true);
drop policy if exists "Admins update homepage" on public.ldbc_site_content;
create policy "Admins update homepage" on public.ldbc_site_content for update to authenticated using (exists(select 1 from public.ldbc_admins where user_id=auth.uid())) with check (exists(select 1 from public.ldbc_admins where user_id=auth.uid()));
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('ldbc-post-images','ldbc-post-images',true,3145728,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=3145728,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "Read LDBC post images" on storage.objects;
create policy "Read LDBC post images" on storage.objects for select using(bucket_id='ldbc-post-images');
drop policy if exists "Admins upload LDBC images" on storage.objects;
create policy "Admins upload LDBC images" on storage.objects for insert to authenticated with check(bucket_id='ldbc-post-images' and exists(select 1 from public.ldbc_admins where user_id=auth.uid()));
commit;
-- Then run supabase-seed.sql to import existing posts and homepage text.
-- Create a confirmed user in Supabase Authentication and grant it explicitly:
-- insert into public.ldbc_admins(user_id) select id from auth.users where email='YOUR_ADMIN_EMAIL';
-- Disable public signup. Never give browser users INSERT/UPDATE on ldbc_admins.
