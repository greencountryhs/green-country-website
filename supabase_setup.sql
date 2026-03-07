-- ==========================================
-- 1. PROFILES TABLE & TRIGGERS
-- ==========================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'employee')) default 'employee',
  full_name text,
  created_at timestamptz default now()
);

-- Defensive function creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'employee')
  on conflict (id) do nothing;
  
  return new;
end;
$$;

-- Defensive trigger creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- 2. SCHEMA ADJUSTMENTS (EMPLOYEES)
-- ==========================================

-- Add user_id responsibly (if not exists)
alter table public.employees 
add column if not exists user_id uuid references auth.users(id) on delete set null;

-- ==========================================
-- 3. DROP EXISTING/DEV POLICIES
-- ==========================================
-- Old Dev Policies Cleanup
drop policy if exists "Enable read access for all users" on public.employees;
drop policy if exists "Enable insert for authenticated users only" on public.employees;
drop policy if exists "Enable update for users based on email" on public.employees;
drop policy if exists "Enable delete for users based on user_id" on public.employees;
drop policy if exists "Enable all for public" on public.employees;

drop policy if exists "Allow public read access to employees" on public.employees;
drop policy if exists "Allow public insert access to employees" on public.employees;
drop policy if exists "Allow public update access to employees" on public.employees;
drop policy if exists "Allow public delete access to employees" on public.employees;

drop policy if exists "Enable read access for all users" on public.time_entries;
drop policy if exists "Enable insert for authenticated users only" on public.time_entries;
drop policy if exists "Enable update for users based on email" on public.time_entries;
drop policy if exists "Enable delete for users based on user_id" on public.time_entries;
drop policy if exists "Enable all for public" on public.time_entries;

drop policy if exists "Allow public read access to time_entries" on public.time_entries;
drop policy if exists "Allow public insert access to time_entries" on public.time_entries;
drop policy if exists "Allow public update access to time_entries" on public.time_entries;
drop policy if exists "Allow public delete access to time_entries" on public.time_entries;

-- Drop new policies to make script idempotent
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admins can update all profiles" on public.profiles;
drop policy if exists "Admins can insert profiles" on public.profiles;

drop policy if exists "Admins can manage employees" on public.employees;
drop policy if exists "Employees can view own record" on public.employees;

drop policy if exists "Admins can manage time_entries" on public.time_entries;
drop policy if exists "Employees can view own time_entries" on public.time_entries;
drop policy if exists "Employees can insert own time_entries" on public.time_entries;
drop policy if exists "Employees can update own time_entries" on public.time_entries;

-- ==========================================
-- 4. ENABLE RLS
-- ==========================================
alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.time_entries enable row level security;

-- ==========================================
-- 5. RLS POLICIES FOR PROFILES
-- ==========================================
create policy "Users can view their own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' )
  );

create policy "Admins can update all profiles"
  on public.profiles for update
  using (
    exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' )
  )
  with check (
    exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' )
  );

create policy "Admins can insert profiles"
  on public.profiles for insert
  with check (
    exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' )
  );

-- ==========================================
-- 6. RLS POLICIES FOR EMPLOYEES
-- ==========================================
create policy "Admins can manage employees"
  on public.employees for all
  using (
    exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' )
  )
  with check (
    exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' )
  );

create policy "Employees can view own record"
  on public.employees for select
  using ( user_id = auth.uid() );

-- ==========================================
-- 7. RLS POLICIES FOR TIME_ENTRIES
-- ==========================================
-- Admins can do everything
create policy "Admins can manage time_entries"
  on public.time_entries for all
  using (
    exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' )
  )
  with check (
    exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' )
  );

-- Employees can select their own time entries
create policy "Employees can view own time_entries"
  on public.time_entries for select
  using (
    employee_id in (select id from public.employees where user_id = auth.uid())
  );

-- Employees can insert their own time entries (e.g., clock in)
create policy "Employees can insert own time_entries"
  on public.time_entries for insert
  with check (
    employee_id in (select id from public.employees where user_id = auth.uid())
  );

-- Employees can update their own time entries (e.g., clock out)
create policy "Employees can update own time_entries"
  on public.time_entries for update
  using (
    employee_id in (select id from public.employees where user_id = auth.uid())
  )
  with check (
    employee_id in (select id from public.employees where user_id = auth.uid())
  );

-- ==========================================
-- 8. ADMIN BOOTSTRAP INSTRUCTIONS
-- ==========================================
/*
  HOW TO PROMOTE YOUR FIRST USER TO ADMIN:

  1. Sign up / Create an account in your app via /login or Signup page.
  2. The trigger will automatically create a profile with role = 'employee'.
  3. Come back to the Supabase SQL Editor and run the following command,
     replacing 'your-email@example.com' with the email you signed up with:

  UPDATE public.profiles
  SET role = 'admin'
  WHERE id = (
    SELECT id FROM auth.users WHERE email = 'your-email@example.com'
  );

*/
