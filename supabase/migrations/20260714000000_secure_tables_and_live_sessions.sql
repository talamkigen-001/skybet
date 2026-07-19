-- ============================================================
-- DROP CLIENT-SIDE DIRECT INSERT POLICY ON CRASH BETS
-- ============================================================
DROP POLICY IF EXISTS "bets_insert_self" ON public.crash_bets;

-- ============================================================
-- CREATE LIVE GAME SESSIONS TABLE (Stateful Blackjack, Mines, Poker)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.live_game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  bet_amount NUMERIC(18,2) NOT NULL,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing for user session queries
CREATE INDEX IF NOT EXISTS idx_live_game_sessions_user ON public.live_game_sessions(user_id, status);

-- Enable RLS and setup policies
ALTER TABLE public.live_game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_select_self" ON public.live_game_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Permissions
GRANT SELECT ON public.live_game_sessions TO authenticated;
GRANT ALL ON public.live_game_sessions TO service_role;

-- ============================================================
-- PROFILE CUSTOM SEED COLUMN
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS client_seed TEXT NOT NULL DEFAULT 'lucky-player';

-- ============================================================
-- INDEX CRASH BETS FOR PERFORMANCE OPTIMIZATION
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_crash_bets_created ON public.crash_bets(created_at DESC);
