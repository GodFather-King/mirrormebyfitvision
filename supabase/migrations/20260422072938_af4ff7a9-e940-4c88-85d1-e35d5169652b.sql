CREATE OR REPLACE FUNCTION public.get_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can look up users by email';
  END IF;

  SELECT id INTO uid FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  RETURN uid;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_id_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO authenticated;