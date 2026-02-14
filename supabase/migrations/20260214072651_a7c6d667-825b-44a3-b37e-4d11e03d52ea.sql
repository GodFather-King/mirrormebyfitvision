
-- Track daily try-on usage per user
CREATE TABLE public.try_on_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  item_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.try_on_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own usage
CREATE POLICY "Users can view own usage" ON public.try_on_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage" ON public.try_on_usage FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index for fast daily lookups
CREATE INDEX idx_try_on_usage_user_date ON public.try_on_usage (user_id, used_at);
