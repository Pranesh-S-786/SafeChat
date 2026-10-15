-- Migration: Add unique username column and index to public.profiles
-- Ensures that the user name entered during registration is primary and unique.

-- 1. Add username column if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT;

-- 2. Populate username for any existing users from email or display_name
UPDATE public.profiles
SET username = LOWER(REGEXP_REPLACE(COALESCE(display_name, SPLIT_PART(email, '@', 1)), '[^a-zA-Z0-9_]', '_', 'g'))
WHERE username IS NULL OR username = '';

-- 3. Add UNIQUE constraint and index on lower(username)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx 
ON public.profiles (LOWER(username));

-- 4. Update the handle_new_user trigger function to persist unique username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    chosen_username TEXT;
BEGIN
    chosen_username := COALESCE(
        NEW.raw_user_meta_data->>'username',
        LOWER(REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)), '[^a-zA-Z0-9_]', '_', 'g'))
    );

    INSERT INTO public.profiles (id, email, display_name, username, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
        chosen_username,
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
