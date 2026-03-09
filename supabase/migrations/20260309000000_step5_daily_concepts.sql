-- ============================================================
-- Step 5: Daily Concept Learning ("Daily Bite")
--
-- Two new tables:
--   daily_concepts         – one AI-generated article + quiz per day
--   user_concept_progress  – tracks each user's quiz completion
--
-- Safe to re-run: uses IF NOT EXISTS / DROP IF EXISTS.
-- ============================================================

-- ── Tables ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.daily_concepts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date        NOT NULL UNIQUE,          -- one concept per calendar day
  title       text        NOT NULL,
  content     text        NOT NULL,                 -- 2-3 paragraph article
  quiz_data   jsonb       NOT NULL DEFAULT '[]',    -- array of { question, options, correct_index, explanation }
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_concept_progress (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  concept_id    uuid        NOT NULL REFERENCES public.daily_concepts(id) ON DELETE CASCADE,
  score         int         NOT NULL,               -- number of correct answers (0-3)
  completed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, concept_id)                      -- one attempt per user per concept
);

-- ── Indexes ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_daily_concepts_date
  ON public.daily_concepts(date);

CREATE INDEX IF NOT EXISTS idx_user_concept_progress_user
  ON public.user_concept_progress(user_id);

-- ── Row-Level Security ────────────────────────────────────────

ALTER TABLE public.daily_concepts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_concept_progress  ENABLE ROW LEVEL SECURITY;

-- daily_concepts: any authenticated user can read
DROP POLICY IF EXISTS "Authenticated users can read daily concepts" ON public.daily_concepts;
CREATE POLICY "Authenticated users can read daily concepts"
  ON public.daily_concepts FOR SELECT
  TO authenticated
  USING (true);

-- user_concept_progress: users can read and insert their own rows
DROP POLICY IF EXISTS "Users can view own concept progress" ON public.user_concept_progress;
CREATE POLICY "Users can view own concept progress"
  ON public.user_concept_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own concept progress" ON public.user_concept_progress;
CREATE POLICY "Users can insert own concept progress"
  ON public.user_concept_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
