
-- Drop the overly permissive SELECT policy
DROP POLICY "Anyone authenticated can read messages" ON public.chat_messages;

-- Create a restrictive policy: users can only see their own messages
CREATE POLICY "Users can view their own messages"
ON public.chat_messages
FOR SELECT
USING (auth.uid() = user_id);
