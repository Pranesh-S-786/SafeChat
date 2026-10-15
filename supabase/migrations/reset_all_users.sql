-- ==============================================================================
-- DANGER: Irreversible Database Reset Script
-- Deletes all existing users from auth.users and all conversations/messages.
-- Run this in your Supabase SQL Editor (in your browser tab: "Untitled query | SQL Editor")
-- ==============================================================================

-- 1. Delete all users from Supabase auth (cascades to public.profiles, messages, participants, challenges)
DELETE FROM auth.users;

-- 2. Clear any orphaned conversations
DELETE FROM public.conversations;

-- 3. Verify clean state (all should return 0)
SELECT count(*) AS remaining_auth_users FROM auth.users;
SELECT count(*) AS remaining_profiles FROM public.profiles;
SELECT count(*) AS remaining_conversations FROM public.conversations;
SELECT count(*) AS remaining_messages FROM public.messages;
