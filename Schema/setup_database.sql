-- Enable PostGIS if available (optional, but good for geo)
-- create extension if not exists postgis;

-- PROFILES (Users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  role text check (role in ('rider', 'driver')),
  created_at timestamptz default now()
);

-- DRIVERS (Real-time locations)
create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  vehicle_type text check (vehicle_type in ('bike', 'auto', 'car')),
  location_lat float,
  location_lng float,
  is_available boolean default true,
  updated_at timestamptz default now()
);

-- RIDES (Bookings)
create table public.rides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  driver_id uuid references public.drivers(id),
  pickup_lat float,
  pickup_lng float,
  drop_lat float,
  drop_lng float,
  vehicle_type text,
  price float,
  status text default 'pending' check (status in ('pending', 'accepted', 'completed', 'cancelled')),
  created_at timestamptz default now()
);

-- RLS POLICIES (Simple for prototype)
alter table public.profiles enable row level security;
alter table public.drivers enable row level security;
alter table public.rides enable row level security;

create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);

create policy "Drivers are viewable by everyone." on public.drivers for select using (true);
create policy "Drivers can update their own location." on public.drivers for update using (true); -- Simplified for demo

create policy "Rides viewable by creator." on public.rides for select using (auth.uid() = user_id);
create policy "Rides insertable by authenticated users." on public.rides for insert with check (auth.uid() = user_id);

-- DUMMY DATA FOR TESTING (Jaisalmer Locations)
insert into public.drivers (vehicle_type, location_lat, location_lng, is_available) values 
('bike', 26.9157, 70.9083, true), -- Jaisalmer Fort
('auto', 26.9120, 70.9100, true), -- Near Gadisar
('car', 26.9200, 70.9000, true);  -- City Center
