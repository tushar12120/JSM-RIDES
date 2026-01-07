-- FIX PERMISSIONS FOR PROFILES TABLE
alter table public.profiles enable row level security;

-- Drop strict policies
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Enable all access" on public.profiles;

-- Create Permissive Policy
create policy "Enable all access" on public.profiles
for all
using (true)
with check (true);
