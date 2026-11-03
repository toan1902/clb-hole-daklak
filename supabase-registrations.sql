-- LĐBC: đơn đăng ký tham gia CLB gửi từ trang /dang-ky.html.
-- Khách (anon) chỉ được THÊM đơn mới; không đọc, sửa hay xóa được đơn nào.
-- Chỉ tài khoản có trong ldbc_admins mới xem và cập nhật trạng thái đơn.
begin;
create table if not exists public.ldbc_registrations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(full_name) between 2 and 120),
  birth_date text not null default '' check (length(birth_date)<=40),
  occupation text not null default '' check (length(occupation)<=240),
  address text not null default '' check (length(address)<=500),
  id_number text not null default '' check (length(id_number)<=20),
  id_place text not null default '' check (length(id_place)<=240),
  phone text not null check (length(phone) between 8 and 20),
  company text not null default '' check (length(company)<=240),
  company_address text not null default '' check (length(company_address)<=500),
  business_license text not null default '' check (length(business_license)<=120),
  company_phone text not null default '' check (length(company_phone)<=40),
  fax text not null default '' check (length(fax)<=40),
  website text not null default '' check (length(website)<=300),
  email text not null default '' check (length(email)<=254),
  note text not null default '' check (length(note)<=1000),
  agreed_rules boolean not null check (agreed_rules),
  agreed_data boolean not null check (agreed_data),
  status text not null default 'new' check (status in ('new','contacted','approved','rejected')),
  created_at timestamptz not null default now()
);
create index if not exists ldbc_registrations_created on public.ldbc_registrations(created_at desc);
alter table public.ldbc_registrations enable row level security;
revoke all on public.ldbc_registrations from anon,authenticated;
grant insert on public.ldbc_registrations to anon,authenticated;
grant select,update(status) on public.ldbc_registrations to authenticated;
drop policy if exists "Anyone submits a new registration" on public.ldbc_registrations;
create policy "Anyone submits a new registration" on public.ldbc_registrations for insert to anon,authenticated with check (status='new');
drop policy if exists "Admins read registrations" on public.ldbc_registrations;
create policy "Admins read registrations" on public.ldbc_registrations for select to authenticated using (exists(select 1 from public.ldbc_admins where user_id=auth.uid()));
drop policy if exists "Admins update registrations" on public.ldbc_registrations;
create policy "Admins update registrations" on public.ldbc_registrations for update to authenticated using (exists(select 1 from public.ldbc_admins where user_id=auth.uid())) with check (exists(select 1 from public.ldbc_admins where user_id=auth.uid()));
commit;
