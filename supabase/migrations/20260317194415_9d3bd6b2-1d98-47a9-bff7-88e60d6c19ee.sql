
-- Create page_views table for custom analytics tracking
CREATE TABLE public.page_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  session_id text NOT NULL,
  page_path text NOT NULL,
  referrer text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon + authenticated) to insert page views
CREATE POLICY "Anyone can insert page views"
ON public.page_views
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only allow reading via service role (admin dashboard will use edge function)
-- No SELECT policy for regular users

-- Index for efficient daily queries
CREATE INDEX idx_page_views_created_at ON public.page_views (created_at DESC);
CREATE INDEX idx_page_views_user_id ON public.page_views (user_id);
CREATE INDEX idx_page_views_page_path ON public.page_views (page_path);
