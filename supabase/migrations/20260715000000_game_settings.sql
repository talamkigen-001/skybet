-- ============================================================
-- GAME SETTINGS CONTROL TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.game_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  house_edge NUMERIC(5,4) NOT NULL DEFAULT 0.01,
  win_rate NUMERIC(5,4) NOT NULL DEFAULT 0.20,
  force_next_crash NUMERIC(10,2) CHECK (force_next_crash >= 1.00),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default row
INSERT INTO public.game_settings (id, house_edge, win_rate)
VALUES (1, 0.01, 0.20)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions for roles
GRANT SELECT, UPDATE ON public.game_settings TO authenticated;
GRANT ALL ON public.game_settings TO service_role;
