-- Add match_accuracy column to verification_challenges to record biometric face match accuracy percentage
ALTER TABLE public.verification_challenges 
ADD COLUMN IF NOT EXISTS match_accuracy NUMERIC;
