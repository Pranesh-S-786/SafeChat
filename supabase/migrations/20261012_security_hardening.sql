-- SafeChat Milestone 1: Security Hardening Migration
-- Idempotent and backward-compatible with existing messages and conversations.
-- Apply in Supabase SQL Editor.

-- ============================================================================
-- 1. HARDEN MESSAGES TABLE (Immutability & Integrity)
-- ============================================================================

-- Make risk_level default to NULL to avoid leaking unencrypted classification metadata
ALTER TABLE public.messages ALTER COLUMN risk_level DROP DEFAULT;
ALTER TABLE public.messages ALTER COLUMN risk_level SET DEFAULT NULL;

-- Trigger to strictly forbid modification of immutable cryptographic payload and metadata
CREATE OR REPLACE FUNCTION public.enforce_message_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent modification of immutable fields
    IF NEW.id <> OLD.id OR
       NEW.conversation_id <> OLD.conversation_id OR
       NEW.sender_id <> OLD.sender_id OR
       NEW.encrypted_content <> OLD.encrypted_content OR
       NEW.iv <> OLD.iv OR
       NEW.key_distribution <> OLD.key_distribution OR
       NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'Cryptographic message payload and metadata are immutable.';
    END IF;

    -- Only status may be updated, and only to permitted lifecycle states
    IF NEW.status NOT IN ('sent', 'delivered', 'read') THEN
        RAISE EXCEPTION 'Invalid message status value: %', NEW.status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_message_immutability ON public.messages;
CREATE TRIGGER trg_enforce_message_immutability
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_message_immutability();

-- Harden UPDATE policy on messages with WITH CHECK clause
DROP POLICY IF EXISTS "Participants can update message status" ON public.messages;
CREATE POLICY "Participants can update message status"
    ON public.messages FOR UPDATE
    TO authenticated
    USING (
        public.is_conversation_participant(conversation_id, auth.uid())
    )
    WITH CHECK (
        public.is_conversation_participant(conversation_id, auth.uid())
    );


-- ============================================================================
-- 2. HARDEN VERIFICATION CHALLENGES (State Machine & Nonce Protection)
-- ============================================================================

-- Trigger to validate verification challenge state transitions and metadata immutability
CREATE OR REPLACE FUNCTION public.enforce_challenge_state_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent modification of immutable challenge fields
    IF NEW.id <> OLD.id OR
       NEW.conversation_id <> OLD.conversation_id OR
       NEW.requester_id <> OLD.requester_id OR
       NEW.target_id <> OLD.target_id OR
       NEW.reason <> OLD.reason OR
       NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'Verification challenge metadata is immutable.';
    END IF;

    -- Terminal states ('verified', 'failed', 'rejected') cannot be reopened or mutated
    IF OLD.status IN ('verified', 'failed', 'rejected') AND NEW.status <> OLD.status THEN
        RAISE EXCEPTION 'Verification challenge has already concluded with terminal status: %', OLD.status;
    END IF;

    -- Validate allowed lifecycle statuses
    IF NEW.status NOT IN ('pending', 'accepted', 'rejected', 'verified', 'failed') THEN
        RAISE EXCEPTION 'Invalid challenge status: %', NEW.status;
    END IF;

    -- Liveness nonce validation: To transition to 'verified', a valid matching liveness token is required
    IF NEW.status = 'verified' THEN
        IF OLD.liveness_token IS NULL OR OLD.liveness_token = '' OR NEW.liveness_token <> OLD.liveness_token THEN
            RAISE EXCEPTION 'Verification challenge cannot be marked verified without a valid matching liveness token.';
        END IF;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_challenge_state_transition ON public.verification_challenges;
CREATE TRIGGER trg_enforce_challenge_state_transition
    BEFORE UPDATE ON public.verification_challenges
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_challenge_state_transition();

-- Secure RPC function to complete facial verification with authenticated token validation
CREATE OR REPLACE FUNCTION public.complete_facial_verification(
    challenge_id UUID,
    provided_token TEXT,
    outcome TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    ch RECORD;
BEGIN
    SELECT * INTO ch
    FROM public.verification_challenges
    WHERE id = challenge_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Verification challenge not found: %', challenge_id;
    END IF;

    -- Only target user may submit verification outcome
    IF ch.target_id <> auth.uid() THEN
        RAISE EXCEPTION 'Only the target user may complete this verification challenge.';
    END IF;

    -- Ensure challenge is not already in a terminal state
    IF ch.status IN ('verified', 'failed', 'rejected') THEN
        RAISE EXCEPTION 'Challenge is already resolved with status: %', ch.status;
    END IF;

    -- Validate liveness token match
    IF ch.liveness_token IS NULL OR ch.liveness_token = '' OR ch.liveness_token <> provided_token THEN
        RAISE EXCEPTION 'Invalid or mismatched liveness token.';
    END IF;

    -- Validate outcome value
    IF outcome NOT IN ('verified', 'failed', 'rejected') THEN
        RAISE EXCEPTION 'Invalid outcome status: %', outcome;
    END IF;

    UPDATE public.verification_challenges
    SET status = outcome,
        updated_at = NOW()
    WHERE id = challenge_id;

    RETURN TRUE;
END;
$$;

-- Restrict direct UPDATE policy so only authorized participants can alter challenge state
DROP POLICY IF EXISTS "Participants can update verification challenges" ON public.verification_challenges;
CREATE POLICY "Participants can update verification challenges"
    ON public.verification_challenges FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = target_id OR (auth.uid() = requester_id AND status = 'pending')
    )
    WITH CHECK (
        auth.uid() = target_id OR (auth.uid() = requester_id AND status = 'pending')
    );
