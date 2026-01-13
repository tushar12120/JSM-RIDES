-- Secure RLS Setup
-- 1. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

-- 2. POLICIES FOR PROFILES
-- Allow everyone to read profiles (needed for showing Driver Name to Rider)
CREATE POLICY "Public Read Profiles" ON public.profiles
FOR SELECT USING (true);

-- Allow users to update their OWN profile
CREATE POLICY "User Update Own Profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- Allow Admin (service role) or Authenticated insertion (during registration)
-- Supabase Auth triggers usually handle insert, but if Manual:
CREATE POLICY "Insert Profile" ON public.profiles
FOR INSERT WITH CHECK (true);

-- 3. POLICIES FOR DRIVERS
-- Public Read (Riders need to search drivers)
CREATE POLICY "Public Read Drivers" ON public.drivers
FOR SELECT USING (true);

-- Driver Update Self (Location, Status)
-- Assuming 'user_id' column links to auth.users
CREATE POLICY "Driver Self Update" ON public.drivers
FOR UPDATE USING (auth.uid() = user_id);

-- Admin Insert (Registration)
CREATE POLICY "Admin Insert Drivers" ON public.drivers
FOR INSERT WITH CHECK (true); 

-- 4. POLICIES FOR RIDES
-- Riders can see their own rides
CREATE POLICY "Rider View Own Rides" ON public.rides
FOR SELECT USING (auth.uid() = user_id);

-- Drivers can see Pending/Assigned rides
-- For simplicity in prototype: Allow All Authenticated Users to see Rides
-- (Refine this if strict privacy needed, but 'round robin' needs visibility)
CREATE POLICY "Auth View Rides" ON public.rides
FOR SELECT USING (auth.role() = 'authenticated');

-- Rider Create Ride
CREATE POLICY "Rider Create Ride" ON public.rides
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Driver/Rider Update Ride (Accept, Complete, Cancel)
CREATE POLICY "Auth Update Ride" ON public.rides
FOR UPDATE USING (auth.role() = 'authenticated');

-- 5. REALTIME (Important!)
-- Ensure the publication allows these changes
drop publication if exists supabase_realtime;
create publication supabase_realtime for table rides, drivers;
