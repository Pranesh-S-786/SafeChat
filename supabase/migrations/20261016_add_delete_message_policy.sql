-- Add DELETE policy to public.messages for conversation participants
DROP POLICY IF EXISTS "Participants can delete messages" ON public.messages;
CREATE POLICY "Participants can delete messages"
    ON public.messages FOR DELETE
    TO authenticated
    USING (
        public.is_conversation_participant(conversation_id, auth.uid())
    );
