
CREATE POLICY "Referred user can create referral row" ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = referred_id);
