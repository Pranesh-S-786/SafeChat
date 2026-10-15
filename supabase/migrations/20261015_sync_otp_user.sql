-- ============================================================================
-- SafeChat Milestone: OTP Verified User Synchronization & Email Check
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/wlqgqxpitfepwjquebkk/sql)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Check if an email is already registered in auth.users
CREATE OR REPLACE FUNCTION public.check_email_exists(target_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE lower(trim(email)) = lower(trim(target_email))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_exists(text) TO anon, authenticated;

-- 2. Allow OTP-verified users to sync their password and confirm their email
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

-- Query to clean up any old test users if desired:
-- DELETE FROM auth.users WHERE email = 'praneshsaravanan78@gmail.com';
