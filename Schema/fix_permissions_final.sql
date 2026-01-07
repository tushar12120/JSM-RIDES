-- FIX PERMISSIONS FOR DRIVERS TABLE
alter table public.drivers enable row level security;

-- Drop potential conflicting policies
drop policy if exists "Drivers are viewable by everyone." on public.drivers;
drop policy if exists "Drivers can update their own location." on public.drivers;
drop policy if exists "Drivers all access" on public.drivers;
drop policy if exists "Enable all access" on public.drivers;

-- Create a generic "Allow All" policy for Drivers table (Insert, Update, Select, Delete)
create policy "Enable all access" on public.drivers
for all
using (true)
with check (true);

-- FIX PERMISSIONS FOR RIDES TABLE
alter table public.rides enable row level security;

-- Drop potential conflicting policies
drop policy if exists "Rides viewable by creator." on public.rides;
drop policy if exists "Rides insertable by authenticated users." on public.rides;
drop policy if exists "Rides viewable by everyone" on public.rides;
drop policy if exists "Rides updateable by everyone" on public.rides;

-- Create a generic "Allow All" policy for Rides table
create policy "Enable all access" on public.rides
for all
using (true)
with check (true);
