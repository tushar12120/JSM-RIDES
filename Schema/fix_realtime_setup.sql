-- 1. Enable Realtime for Tables (Critical for .on() events)
-- Try adding tables to default publication
alter publication supabase_realtime add table public.rides;
alter publication supabase_realtime add table public.drivers;

-- 2. DISABLE RLS completely for Smooth Demo Flow (Fixes 'Permission Denied' on Select/Update)
alter table public.rides disable row level security;
alter table public.drivers disable row level security;
alter table public.profiles disable row level security;

-- 3. Just in case, grant all to anon/authenticated (if RLS was causing issues at role level)
grant all on table public.rides to anon, authenticated, service_role;
grant all on table public.drivers to anon, authenticated, service_role;
grant all on table public.profiles to anon, authenticated, service_role;
