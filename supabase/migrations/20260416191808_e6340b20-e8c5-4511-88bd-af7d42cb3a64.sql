
CREATE TABLE public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own code" ON public.referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create their own code" ON public.referral_codes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can lookup code for signup" ON public.referral_codes FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL UNIQUE,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rewarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see referrals they're part of" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE TABLE public.bonus_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bonus_credits_user ON public.bonus_credits(user_id);
ALTER TABLE public.bonus_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own credits" ON public.bonus_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own consumption" ON public.bonus_credits FOR INSERT WITH CHECK (auth.uid() = user_id AND reason = 'consumed' AND amount < 0);

CREATE OR REPLACE FUNCTION public.create_referral_code_for_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_code text;
BEGIN
  new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  INSERT INTO public.referral_codes (user_id, code) VALUES (NEW.user_id, new_code)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_make_referral_code
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.create_referral_code_for_user();

CREATE OR REPLACE FUNCTION public.get_bonus_credits(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(amount), 0)::int FROM public.bonus_credits WHERE user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.handle_first_tryon_referral()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prior_count int; ref_record record;
BEGIN
  IF NEW.usage_type <> 'try_on' THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO prior_count FROM public.try_on_usage
    WHERE user_id = NEW.user_id AND usage_type = 'try_on' AND id <> NEW.id;
  IF prior_count > 0 THEN RETURN NEW; END IF;
  SELECT * INTO ref_record FROM public.referrals
    WHERE referred_id = NEW.user_id AND status = 'pending';
  IF NOT FOUND THEN RETURN NEW; END IF;
  INSERT INTO public.bonus_credits (user_id, amount, reason)
    VALUES (ref_record.referrer_id, 5, 'referral_referrer');
  INSERT INTO public.bonus_credits (user_id, amount, reason)
    VALUES (ref_record.referred_id, 3, 'referral_referred');
  UPDATE public.referrals SET status = 'rewarded', rewarded_at = now() WHERE id = ref_record.id;
  INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (ref_record.referrer_id, '🎉 Referral reward unlocked!', 'You earned +5 bonus try-ons. Thanks for sharing MirrorMe!', 'success');
  INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (ref_record.referred_id, '🎁 Welcome bonus unlocked!', 'You got +3 bonus try-ons for joining via a friend.', 'success');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_tryon_grant_referral
AFTER INSERT ON public.try_on_usage
FOR EACH ROW EXECUTE FUNCTION public.handle_first_tryon_referral();

INSERT INTO public.referral_codes (user_id, code)
SELECT user_id, upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
