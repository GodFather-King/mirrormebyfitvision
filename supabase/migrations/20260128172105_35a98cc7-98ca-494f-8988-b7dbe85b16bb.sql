-- Create chat messages table for user-to-user communication
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  shared_avatar_id uuid REFERENCES public.saved_avatars(id) ON DELETE SET NULL,
  shared_avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Everyone can read messages (public chat room)
CREATE POLICY "Anyone authenticated can read messages"
ON public.chat_messages FOR SELECT
TO authenticated
USING (true);

-- Users can create their own messages
CREATE POLICY "Users can create their own messages"
ON public.chat_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete their own messages"
ON public.chat_messages FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;