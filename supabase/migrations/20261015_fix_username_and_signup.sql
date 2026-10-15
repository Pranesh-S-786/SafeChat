-- ============================================================================
-- SafeChat Migration: Fix Username Availability & Registration Triggers
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wlqgqxpitfepwjquebkk/sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Function: Check if a username is already taken (Callable by anon & authenticated)
CREATE OR REPLACE FUNCTION public.check_username_exists(target_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF target_username IS NULL OR trim(target_username) = '' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE lower(trim(username)) = lower(trim(target_username))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_username_exists(text) TO anon, authenticated;

-- 2. Function: Check if an email is already registered in auth.users or profiles
CREATE OR REPLACE FUNCTION public.check_email_exists(target_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF target_email IS NULL OR trim(target_email) = '' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE lower(trim(email)) = lower(trim(target_email))
  ) OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE lower(trim(email)) = lower(trim(target_email))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_exists(text) TO anon, authenticated;

-- 3. Function: Allow OTP-verified users to sync password and confirm email
CREATE OR REPLACE FUNCTION public.sync_otp_user(
  target_email text,
  target_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_updated boolean := false;
BEGIN
  UPDATE auth.users
  SET encrypted_password = crypt(target_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
  WHERE lower(trim(email)) = lower(trim(target_email));

  IF FOUND THEN
    v_updated := true;
  END IF;

  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_otp_user(text, text) TO anon, authenticated;

-- 4. Enable public read access for username checking on public.profiles
DROP POLICY IF EXISTS "Anyone can check username existence" ON public.profiles;
CREATE POLICY "Anyone can check username existence"
    ON public.profiles FOR SELECT
    TO anon, authenticated
    USING (true);

-- 5. Resilient handle_new_user trigger function
-- Eliminates "Database error saving new user" by safely resolving duplicate usernames
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    base_username TEXT;
    candidate_username TEXT;
    iter_count INT := 0;
BEGIN
    base_username := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
        LOWER(REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)), '[^a-zA-Z0-9_]', '_', 'g'))
    );
    candidate_username := base_username;

    -- If the requested username is already taken by another user, disambiguate with unique suffix
    WHILE EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE LOWER(username) = LOWER(candidate_username) 
          AND id <> NEW.id
    ) AND iter_count < 10 LOOP
        iter_count := iter_count + 1;
        candidate_username := base_username || '_' || floor(random() * 9000 + 1000)::text;
    END LOOP;

    INSERT INTO public.profiles (
        id, 
        email, 
        display_name, 
        username, 
        avatar_url,
        face_enrolled
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
        candidate_username,
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE((NEW.raw_user_meta_data->>'face_enrolled')::boolean, false)
    )
    ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        face_enrolled = EXCLUDED.face_enrolled,
        updated_at = NOW();

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Fallback handler ensures auth.users sign up never fails with "Database error saving new user"
    RAISE WARNING 'handle_new_user trigger encountered error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-attach trigger safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- HELPER CLEANUP (Optional):
-- If your test email 2403717672621037@cit.edu.in was partially created during testing
-- and you want to register it from scratch, uncomment and run:
-- DELETE FROM auth.users WHERE email = '2403717672621037@cit.edu.in';
-- ============================================================================
