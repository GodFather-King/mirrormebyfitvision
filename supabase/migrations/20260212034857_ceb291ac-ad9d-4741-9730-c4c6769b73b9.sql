
-- Fix overly permissive UPDATE policy
DROP POLICY "Service role can update subscriptions" ON public.subscriptions;

-- Only allow users to view updates to their own subscriptions (updates will be done via service role in edge function)
CREATE POLICY "Users can update their own subscriptions"
ON public.subscriptions FOR UPDATE
USING (auth.uid() = user_id);
