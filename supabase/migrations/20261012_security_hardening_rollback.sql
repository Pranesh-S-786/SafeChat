-- SafeChat Milestone 1: Rollback Migration Script
-- Reverts security triggers and restores previous table definitions if ever required.
-- Safe to run in Supabase SQL Editor.

-- ============================================================================
-- 1. ROLLBACK MESSAGES HARDENING
-- ============================================================================

DROP TRIGGER IF EXISTS trg_enforce_message_immutability ON public.messages;
DROP FUNCTION IF EXISTS public.enforce_message_immutability();

ALTER TABLE public.messages ALTER COLUMN risk_level SET DEFAULT 'safe';

DROP POLICY IF EXISTS "Participants can update message status" ON public.messages;
CREATE POLICY "Participants can update message status"
    ON public.messages FOR UPDATE
    TO authenticated
    USING (
        public.is_conversation_participant(conversation_id, auth.uid())
    );

-- ============================================================================
-- 2. ROLLBACK VERIFICATION CHALLENGES HARDENING
-- ============================================================================

DROP TRIGGER IF EXISTS trg_enforce_challenge_state_transition ON public.verification_challenges;
DROP FUNCTION IF EXISTS public.enforce_challenge_state_transition();
DROP FUNCTION IF EXISTS public.complete_facial_verification(UUID, TEXT, TEXT);

DROP POLICY IF EXISTS "Participants can update verification challenges" ON public.verification_challenges;
CREATE POLICY "Participants can update verification challenges"
    ON public.verification_challenges FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = requester_id OR auth.uid() = target_id
    );
