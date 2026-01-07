-- Add Vehicle Model column to drivers table
alter table public.drivers add column if not exists vehicle_model text;

-- Update RLS if needed (already permissive in fix_rls.sql)
