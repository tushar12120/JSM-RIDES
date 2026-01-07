-- Add Dispatch Columns
alter table public.rides add column if not exists target_driver_id uuid;

-- Ensure Driver Location Columns
alter table public.drivers add column if not exists location_lat float;
alter table public.drivers add column if not exists location_lng float;
alter table public.drivers add column if not exists is_available boolean default true;
