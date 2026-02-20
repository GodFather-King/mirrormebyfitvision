
-- Remove user INSERT/UPDATE policies on subscriptions - only backend should modify these
DROP POLICY "Users can insert their own subscriptions" ON public.subscriptions;
DROP POLICY "Users can update their own subscriptions" ON public.subscriptions;
