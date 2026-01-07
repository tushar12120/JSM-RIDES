-- Add OTP column
alter table public.rides add column if not exists otp text;

-- Update Status Check Constraint to allow 'in_progress'
alter table public.rides drop constraint if exists rides_status_check;
alter table public.rides add constraint rides_status_check 
check (status in ('pending', 'accepted', 'in_progress', 'completed', 'cancelled'));

-- Add Driver Current Lat/Lng tracking (already in drivers, just ensuring permissions)
-- (Permissions handled by fix_permissions_final.sql)
