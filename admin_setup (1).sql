-- ============ imMBA admin setup (run once in Supabase > SQL Editor) ============

-- 1) Profiles: one row per registered user, with a role
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'pending' check (role in ('pending','admin','super_admin','rejected')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- New users automatically get role = pending
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users that already existed
insert into public.profiles (id, email) select id, email from auth.users on conflict do nothing;

-- 2) Helper functions
create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'));
$$;
create or replace function public.is_super_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin');
$$;

-- 3) Profiles policies
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (id = auth.uid());
drop policy if exists "super admin reads all" on public.profiles;
create policy "super admin reads all" on public.profiles for select using (public.is_super_admin());
drop policy if exists "super admin updates roles" on public.profiles;
create policy "super admin updates roles" on public.profiles for update
  using (public.is_super_admin()) with check (public.is_super_admin());

-- 4) Faculty: everyone reads (already set), only admins write
drop policy if exists "admins insert faculty" on public.faculty;
create policy "admins insert faculty" on public.faculty for insert with check (public.is_admin());
drop policy if exists "admins update faculty" on public.faculty;
create policy "admins update faculty" on public.faculty for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins delete faculty" on public.faculty;
create policy "admins delete faculty" on public.faculty for delete using (public.is_admin());

-- 5) Storage bucket for faculty photos (public to read, only admins write)
insert into storage.buckets (id, name, public) values ('faculty-photos', 'faculty-photos', true)
  on conflict (id) do nothing;
drop policy if exists "admins upload photos" on storage.objects;
create policy "admins upload photos" on storage.objects for insert
  with check (bucket_id = 'faculty-photos' and public.is_admin());
drop policy if exists "admins update photos" on storage.objects;
create policy "admins update photos" on storage.objects for update
  using (bucket_id = 'faculty-photos' and public.is_admin());
drop policy if exists "admins delete photos" on storage.objects;
create policy "admins delete photos" on storage.objects for delete
  using (bucket_id = 'faculty-photos' and public.is_admin());

-- 6) LATER (after you register in admin.html): make yourself super_admin.
--    Replace the email and run ONLY this line:
-- update public.profiles set role = 'super_admin' where email = 'TU_EMAIL_AQUI';
