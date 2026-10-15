-- SafeChat Production Database Schema (Idempotent Migration)
-- Safe to run repeatedly without errors.

-- 1. Profiles Table (linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    username TEXT UNIQUE,
    avatar_url TEXT,
    public_key TEXT, -- Public key for client-side E2EE (JWK or base64)
    face_enrolled BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can check username existence" ON public.profiles;
CREATE POLICY "Anyone can check username existence"
    ON public.profiles FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- 2. Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 3. Conversation Participants Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Helper function to check conversation membership without RLS infinite recursion
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conv_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.conversation_participants
        WHERE conversation_id = _conv_id
          AND user_id = _user_id
    );
$$;

-- Conversations Policies
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
CREATE POLICY "Users can view conversations they participate in"
    ON public.conversations FOR SELECT
    TO authenticated
    USING (
        public.is_conversation_participant(id, auth.uid())
    );

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
    ON public.conversations FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Conversation Participants Policies
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
CREATE POLICY "Users can view participants of their conversations"
    ON public.conversation_participants FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR public.is_conversation_participant(conversation_id, auth.uid())
    );

DROP POLICY IF EXISTS "Users can join/add participants to conversations" ON public.conversation_participants;
CREATE POLICY "Users can join/add participants to conversations"
    ON public.conversation_participants FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() OR public.is_conversation_participant(conversation_id, auth.uid())
    );

-- 4. Messages Table (Encrypted ciphertext only)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    encrypted_content TEXT NOT NULL,  -- AES-GCM 256 ciphertext in Base64
    iv TEXT NOT NULL,                 -- Initialization Vector in Base64
    key_distribution JSONB NOT NULL,  -- Map of { [user_id]: encrypted_session_key_base64 }
    risk_level TEXT DEFAULT NULL,    -- Plaintext classification omitted from client writes
    status TEXT DEFAULT 'sent',       -- 'sent', 'delivered', 'read'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Messages Policies
DROP POLICY IF EXISTS "Participants can view conversation messages" ON public.messages;
CREATE POLICY "Participants can view conversation messages"
    ON public.messages FOR SELECT
    TO authenticated
    USING (
        public.is_conversation_participant(conversation_id, auth.uid())
    );

DROP POLICY IF EXISTS "Participants can insert messages" ON public.messages;
CREATE POLICY "Participants can insert messages"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = sender_id AND
        public.is_conversation_participant(conversation_id, auth.uid())
    );

-- Trigger to strictly forbid modification of immutable cryptographic payload and metadata
CREATE OR REPLACE FUNCTION public.enforce_message_immutability()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id <> OLD.id OR
       NEW.conversation_id <> OLD.conversation_id OR
       NEW.sender_id <> OLD.sender_id OR
       NEW.encrypted_content <> OLD.encrypted_content OR
       NEW.iv <> OLD.iv OR
       NEW.key_distribution <> OLD.key_distribution OR
       NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'Cryptographic message payload and metadata are immutable.';
    END IF;

    IF NEW.status NOT IN ('sent', 'delivered', 'read') THEN
        RAISE EXCEPTION 'Invalid message status: %', NEW.status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_message_immutability ON public.messages;
CREATE TRIGGER trg_enforce_message_immutability
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_message_immutability();

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

-- 5. Verification Challenges Table (Facial Verification between participants)
CREATE TABLE IF NOT EXISTS public.verification_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,             -- e.g. "Keystroke Behavioral Anomaly Detected"
    status TEXT DEFAULT 'pending',    -- 'pending', 'accepted', 'rejected', 'verified', 'failed'
    liveness_token TEXT,              -- Random challenge nonce to guarantee fresh session
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.verification_challenges ENABLE ROW LEVEL SECURITY;

-- Trigger to validate verification challenge state transitions and metadata immutability
CREATE OR REPLACE FUNCTION public.enforce_challenge_state_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id <> OLD.id OR
       NEW.conversation_id <> OLD.conversation_id OR
       NEW.requester_id <> OLD.requester_id OR
       NEW.target_id <> OLD.target_id OR
       NEW.reason <> OLD.reason OR
       NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'Verification challenge metadata is immutable.';
    END IF;

    IF OLD.status IN ('verified', 'failed', 'rejected') AND NEW.status <> OLD.status THEN
        RAISE EXCEPTION 'Verification challenge has already concluded with terminal status: %', OLD.status;
    END IF;

    IF NEW.status NOT IN ('pending', 'accepted', 'rejected', 'verified', 'failed') THEN
        RAISE EXCEPTION 'Invalid challenge status: %', NEW.status;
    END IF;

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

    IF ch.target_id <> auth.uid() THEN
        RAISE EXCEPTION 'Only the target user may complete this verification challenge.';
    END IF;

    IF ch.status IN ('verified', 'failed', 'rejected') THEN
        RAISE EXCEPTION 'Challenge is already resolved with status: %', ch.status;
    END IF;

    IF ch.liveness_token IS NULL OR ch.liveness_token = '' OR ch.liveness_token <> provided_token THEN
        RAISE EXCEPTION 'Invalid or mismatched liveness token.';
    END IF;

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

DROP POLICY IF EXISTS "Participants can view verification challenges" ON public.verification_challenges;
CREATE POLICY "Participants can view verification challenges"
    ON public.verification_challenges FOR SELECT
    TO authenticated
    USING (
        auth.uid() = requester_id OR auth.uid() = target_id
    );

DROP POLICY IF EXISTS "Users can create verification challenges" ON public.verification_challenges;
CREATE POLICY "Users can create verification challenges"
    ON public.verification_challenges FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = requester_id
    );

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

-- 6. RPC Functions for Username & Email Validation
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

-- 7. Trigger to create profile automatically when auth.users signs up
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

    -- If candidate username is taken by another profile, append unique suffix so signup never fails
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Add tables to Supabase Realtime publication safely (ignore if already added)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.verification_challenges;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
