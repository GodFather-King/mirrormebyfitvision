-- Create direct conversations table
CREATE TABLE public.direct_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_1 UUID NOT NULL,
  participant_2 UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_conversation UNIQUE (participant_1, participant_2),
  CONSTRAINT different_participants CHECK (participant_1 <> participant_2)
);

-- Create direct messages table
CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.direct_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Create helper function to check conversation membership
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id UUID, _conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.direct_conversations
    WHERE id = _conversation_id
    AND (_user_id = participant_1 OR _user_id = participant_2)
  )
$$;

-- RLS policies for direct_conversations
CREATE POLICY "Users can view their conversations"
ON public.direct_conversations FOR SELECT
USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can create conversations they're part of"
ON public.direct_conversations FOR INSERT
WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can delete their conversations"
ON public.direct_conversations FOR DELETE
USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- RLS policies for direct_messages
CREATE POLICY "Users can view messages in their conversations"
ON public.direct_messages FOR SELECT
USING (public.is_conversation_participant(auth.uid(), conversation_id));

CREATE POLICY "Users can send messages in their conversations"
ON public.direct_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND public.is_conversation_participant(auth.uid(), conversation_id)
);

CREATE POLICY "Users can delete their own messages"
ON public.direct_messages FOR DELETE
USING (auth.uid() = sender_id);

-- Update policy for marking messages as read
CREATE POLICY "Users can mark messages as read in their conversations"
ON public.direct_messages FOR UPDATE
USING (public.is_conversation_participant(auth.uid(), conversation_id))
WITH CHECK (public.is_conversation_participant(auth.uid(), conversation_id));

-- Enable realtime for direct messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;

-- Add trigger for updating conversation timestamp
CREATE TRIGGER update_direct_conversations_updated_at
BEFORE UPDATE ON public.direct_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Allow profiles to be viewed by authenticated users for DM user selection
CREATE POLICY "Authenticated users can view all profiles for messaging"
ON public.profiles FOR SELECT TO authenticated
USING (true);