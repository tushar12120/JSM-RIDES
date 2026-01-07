-- Allow anyone to view Pending Rides (So Drivers can see them)
drop policy if exists "Rides viewable by creator." on public.rides;
create policy "Rides viewable by everyone" on public.rides for select using (true);

-- Allow anyone to Update Rides (So Drivers can accept them)
-- Warning: In production, check if user is a driver. For demo, allow generic update.
create policy "Rides updateable by everyone" on public.rides for update using (true);

-- Allow inserting drivers by authenticated users
drop policy if exists "Drivers can update their own location." on public.drivers;
create policy "Drivers all access" on public.drivers for all using (true);
