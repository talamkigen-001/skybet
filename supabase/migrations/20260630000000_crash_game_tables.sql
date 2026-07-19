-- ============================================================
-- ADD REFERRAL SUPPORT TO PROFILES
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);

-- Generate random 8-char alphanumeric string for referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INT := 0;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = result);
  END LOOP;
  RETURN result;
END;
$$;

-- Trigger to automatically assign referral code to new profiles
CREATE OR REPLACE FUNCTION public.handle_profile_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_referral_code();

-- Update existing profiles with a referral code if they don't have one
UPDATE public.profiles
SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL;

-- ============================================================
-- CRASH GAME TABLES
-- ============================================================

-- Crash Rounds
CREATE TABLE public.crash_rounds (
  id BIGSERIAL PRIMARY KEY,
  server_seed TEXT NOT NULL,
  server_seed_hash TEXT NOT NULL,
  client_seed TEXT NOT NULL,
  nonce INT NOT NULL,
  crash_point NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'betting' CHECK (status IN ('betting', 'running', 'crashed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_crash_rounds_created ON public.crash_rounds(created_at DESC);

GRANT SELECT ON public.crash_rounds TO authenticated;
GRANT ALL ON public.crash_rounds TO service_role;
ALTER TABLE public.crash_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rounds_select_all" ON public.crash_rounds FOR SELECT TO authenticated USING (true);

-- Crash Bets
CREATE TABLE public.crash_bets (
  id BIGSERIAL PRIMARY KEY,
  round_id BIGINT REFERENCES public.crash_rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  bet_amount NUMERIC(18,2) NOT NULL CHECK (bet_amount > 0),
  auto_cashout NUMERIC(10,2),
  cashout_multiplier NUMERIC(10,2),
  win_amount NUMERIC(18,2),
  cashed_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crash_bets_round ON public.crash_bets(round_id);
CREATE INDEX idx_crash_bets_user ON public.crash_bets(user_id, created_at DESC);

GRANT SELECT, INSERT ON public.crash_bets TO authenticated;
GRANT ALL ON public.crash_bets TO service_role;
ALTER TABLE public.crash_bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bets_select_all" ON public.crash_bets FOR SELECT TO authenticated USING (true);
CREATE POLICY "bets_insert_self" ON public.crash_bets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Chat Messages
CREATE TABLE public.chat_messages (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL CHECK (length(trim(message)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at DESC);

GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_select_all" ON public.chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "chat_insert_self" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Referrals
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  reward_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);

GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrals_select_self" ON public.referrals FOR SELECT TO authenticated USING (auth.uid() = referrer_id OR auth.uid() = referee_id);
