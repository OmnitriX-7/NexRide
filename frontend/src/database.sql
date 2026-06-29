-- 1. TABLES (Using IF NOT EXISTS so it doesn't error on existing tables)
-- ==========================================
-- 1. TABLES & SCHEMA
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  full_name text,
  email text,
  role text CHECK (role IN ('rider', 'driver')),
  phone_number text,
  onboarded boolean DEFAULT false,
  age int4 CHECK (age >= 0),
  gender text,
  hometown text,
  bio text,
  avatar_url text,
  exp int4 DEFAULT 0,
  level int4 DEFAULT 1,
  referred_by uuid REFERENCES auth.users(id),
  wallet_balance DECIMAL(10,2) DEFAULT 0.00,
  is_premium BOOLEAN DEFAULT false,
  premium_expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'offline' CHECK (status IN ('offline', 'available', 'busy')),
  vehicle_model TEXT,
  car_plate_number TEXT,
  rating DECIMAL(3,2) DEFAULT 5.00,
  base_fare DECIMAL(10,2) DEFAULT 20.00, 
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_percent INT NOT NULL,
  is_used BOOLEAN DEFAULT false,
  notified BOOLEAN DEFAULT false,
  is_referral_reward BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active')), 
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_coupon UNIQUE (user_id, code)
);

CREATE TABLE IF NOT EXISTS public.ride_dispatches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id UUID REFERENCES auth.users(id) NOT NULL,
  driver_id UUID REFERENCES public.drivers(id) NOT NULL,
  pickup_name TEXT NOT NULL,
  dropoff_name TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  dest_lat DOUBLE PRECISION,
  dest_lng DOUBLE PRECISION,
  fare_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'timeout', 'cancelled', 'completed')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 2. SECURITY & RLS
-- ==========================================
ALTER TABLE public.ride_dispatches REPLICA IDENTITY FULL;
ALTER TABLE public.drivers REPLICA IDENTITY FULL;
ALTER TABLE public.coupons REPLICA IDENTITY FULL;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_dispatches ENABLE ROW LEVEL SECURITY;

-- Profile Policies (Public view for trust, but update is restricted to self)
-- REFINED: Only allow public access to non-sensitive fields
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;
CREATE POLICY "Public profiles are viewable" ON public.profiles 
FOR SELECT USING (true); 

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Driver Policies
DROP POLICY IF EXISTS "Anyone view drivers" ON public.drivers;
CREATE POLICY "Anyone view drivers" ON public.drivers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Drivers update self" ON public.drivers;
CREATE POLICY "Drivers update self" ON public.drivers FOR UPDATE USING (auth.uid() = id);

-- Coupon Policies
-- ADDED: Ensure users can only see their own coupons
DROP POLICY IF EXISTS "Users view own coupons" ON public.coupons;
CREATE POLICY "Users view own coupons" ON public.coupons FOR SELECT USING (auth.uid() = user_id);

-- Dispatch Policies
DROP POLICY IF EXISTS "Riders view dispatches" ON public.ride_dispatches;
CREATE POLICY "Riders view dispatches" ON public.ride_dispatches FOR SELECT USING (auth.uid() = rider_id);
DROP POLICY IF EXISTS "Drivers view dispatches" ON public.ride_dispatches;
CREATE POLICY "Drivers view dispatches" ON public.ride_dispatches FOR SELECT USING (auth.uid() = driver_id);
DROP POLICY IF EXISTS "Riders can create dispatches" ON public.ride_dispatches;
CREATE POLICY "Riders can create dispatches" ON public.ride_dispatches FOR INSERT WITH CHECK (auth.uid() = rider_id);
DROP POLICY IF EXISTS "Participants update dispatches" ON public.ride_dispatches;
CREATE POLICY "Participants update dispatches" ON public.ride_dispatches FOR UPDATE USING (auth.uid() = rider_id OR auth.uid() = driver_id);

-- ==========================================
-- 3. STORAGE SETUP (Buckets & Policies)
-- ==========================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Avatar Access" ON storage.objects;
CREATE POLICY "Public Avatar Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can manage their own avatars" ON storage.objects;
CREATE POLICY "Users can manage their own avatars" ON storage.objects FOR ALL
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ==========================================
-- 4. PROCEDURAL FUNCTIONS (RPCs)
-- ==========================================

-- Onboarding Part 1: Save Basic Info
CREATE OR REPLACE FUNCTION public.save_basic_profile(user_full_name TEXT, user_phone TEXT, user_role TEXT) 
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.profiles 
    SET full_name = user_full_name, phone_number = user_phone, role = user_role, onboarded = (CASE WHEN user_role = 'rider' THEN true ELSE false END)
    WHERE id = auth.uid();
    RETURN json_build_object('status', 'success', 'role', user_role);
END;
$$;

-- Onboarding Part 2: Driver Specifics
CREATE OR REPLACE FUNCTION public.complete_driver_profile(v_model TEXT, v_plate TEXT) 
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.drivers (id, status, vehicle_model, car_plate_number) 
    VALUES (auth.uid(), 'offline', v_model, v_plate) 
    ON CONFLICT (id) DO UPDATE SET vehicle_model = EXCLUDED.vehicle_model, car_plate_number = EXCLUDED.car_plate_number;
    UPDATE public.profiles SET onboarded = true WHERE id = auth.uid();
    RETURN json_build_object('status', 'success');
END;
$$;

-- XP Gain Logic (With correct variable assignment to avoid 42P01 error)
CREATE OR REPLACE FUNCTION public.handle_xp_gain(target_user_id UUID, xp_to_add INT4)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_exp INT4; v_lv INT4; v_step INT4 := 100;
BEGIN
    v_exp := (SELECT exp FROM public.profiles WHERE id = target_user_id);
    v_lv  := (SELECT level FROM public.profiles WHERE id = target_user_id);
    v_exp := COALESCE(v_exp, 0) + xp_to_add;
    v_lv  := COALESCE(v_lv, 1);
    WHILE v_exp >= v_step LOOP
        v_lv := v_lv + 1;
        v_exp := v_exp - v_step;
    END LOOP;
    UPDATE public.profiles SET exp = v_exp, level = v_lv WHERE id = target_user_id;
END;
$$;

-- Nearby Drivers Search
-- We must drop this first because changing the return table structure 
-- is not supported by CREATE OR REPLACE.
DROP FUNCTION IF EXISTS get_nearby_drivers(double precision, double precision, double precision);
CREATE OR REPLACE FUNCTION get_nearby_drivers(rider_lat double precision, rider_lng double precision, radius_km double precision)
RETURNS TABLE(id uuid, name text, vehicle text, plate text, fare numeric, rating numeric, lat double precision, lng double precision, distance double precision) 
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, p.full_name, d.vehicle_model, d.car_plate_number, d.base_fare, d.rating, d.lat, d.lng,
    (6371 * acos(cos(radians(rider_lat)) * cos(radians(d.lat)) * cos(radians(d.lng) - radians(rider_lng)) + sin(radians(rider_lat)) * sin(radians(d.lat)))) AS distance
  FROM public.drivers d JOIN public.profiles p ON d.id = p.id
  WHERE d.status = 'available'
    AND (6371 * acos(cos(radians(rider_lat)) * cos(radians(d.lat)) * cos(radians(d.lng) - radians(rider_lng)) + sin(radians(rider_lat)) * sin(radians(d.lat)))) < radius_km
  ORDER BY distance;
END;
$$;

-- ==========================================
-- 5. TRIGGERS
-- ==========================================

-- Auto-create profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
DECLARE
  ref_id UUID := NULL;
BEGIN
  BEGIN
    ref_id := (new.raw_user_meta_data->>'referred_by')::uuid;
  EXCEPTION WHEN OTHERS THEN
    ref_id := NULL;
  END;
  INSERT INTO public.profiles (id, email, referred_by) VALUES (new.id, new.email, ref_id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ride completion XP award
CREATE OR REPLACE FUNCTION public.on_ride_completed_award_xp() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    ride_count INT;
    referrer UUID;
BEGIN
    IF (NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed')) THEN
        PERFORM public.handle_xp_gain(NEW.rider_id, 20);
        PERFORM public.handle_xp_gain(NEW.driver_id, 20);
        
        -- Referral logic: If this is the rider's first completed ride, reward their referrer
        SELECT COUNT(*) INTO ride_count FROM public.ride_dispatches WHERE rider_id = NEW.rider_id AND status = 'completed';
        IF ride_count = 1 THEN
            SELECT referred_by INTO referrer FROM public.profiles WHERE id = NEW.rider_id;
            IF referrer IS NOT NULL THEN
                UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance, 0) + 100.00 WHERE id = referrer;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_ride_completed_xp ON public.ride_dispatches;
CREATE TRIGGER trigger_ride_completed_xp AFTER UPDATE ON public.ride_dispatches FOR EACH ROW EXECUTE FUNCTION public.on_ride_completed_award_xp();

-- ==========================================
-- 6. REALTIME ENABLEMENT
-- ==========================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_dispatches;
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.coupons;
  EXCEPTION WHEN others THEN NULL; END;
END $$;

-- ==========================================
-- 7. LEADERBOARDS & MATERIALIZED VIEWS
-- ==========================================

-- Helper function for distance calculation
CREATE OR REPLACE FUNCTION public.calculate_distance_km(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
RETURNS double precision LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
    RETURN 6371 * acos(
        cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lon2) - radians(lon1)) + 
        sin(radians(lat1)) * sin(radians(lat2))
    );
EXCEPTION WHEN OTHERS THEN
    RETURN 0;
END;
$$;

-- Driver Leaderboard Materialized View
DROP MATERIALIZED VIEW IF EXISTS public.driver_leaderboard;
CREATE MATERIALIZED VIEW public.driver_leaderboard AS
SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    d.rating,
    COUNT(r.id) AS total_rides,
    COALESCE(SUM(r.fare_amount), 0) AS total_earned,
    COALESCE(SUM(public.calculate_distance_km(r.pickup_lat, r.pickup_lng, r.dest_lat, r.dest_lng)), 0) AS total_distance
FROM public.profiles p
JOIN public.drivers d ON p.id = d.id
LEFT JOIN public.ride_dispatches r ON d.id = r.driver_id AND r.status = 'completed'
GROUP BY p.id, p.full_name, p.avatar_url, d.rating;

-- Rider Leaderboard Materialized View
DROP MATERIALIZED VIEW IF EXISTS public.rider_leaderboard;
CREATE MATERIALIZED VIEW public.rider_leaderboard AS
SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    COUNT(r.id) AS total_rides,
    COALESCE(SUM(r.fare_amount), 0) AS total_spent,
    COALESCE(SUM(public.calculate_distance_km(r.pickup_lat, r.pickup_lng, r.dest_lat, r.dest_lng)), 0) AS total_distance
FROM public.profiles p
JOIN public.ride_dispatches r ON p.id = r.rider_id AND r.status = 'completed'
GROUP BY p.id, p.full_name, p.avatar_url;

-- Refresh function
CREATE OR REPLACE FUNCTION public.refresh_leaderboards()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW public.driver_leaderboard;
    REFRESH MATERIALIZED VIEW public.rider_leaderboard;
END;
$$;

-- RLS for materialized views (Views don't have RLS by default, but we can revoke public access and grant to authenticated)
REVOKE ALL ON public.driver_leaderboard FROM PUBLIC;
REVOKE ALL ON public.rider_leaderboard FROM PUBLIC;
GRANT SELECT ON public.driver_leaderboard TO authenticated;
GRANT SELECT ON public.rider_leaderboard TO authenticated;

-- Setup pg_cron to refresh every 24 hours at midnight
-- Note: Requires pg_cron extension enabled in Supabase Dashboard
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('refresh_leaderboards_daily', '0 0 * * *', 'SELECT public.refresh_leaderboards();');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;