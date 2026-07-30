ALTER TABLE public.blessings
  ADD COLUMN IF NOT EXISTS quality_score integer,
  ADD COLUMN IF NOT EXISTS ai_probability integer,
  ADD COLUMN IF NOT EXISTS analysis jsonb,
  ADD COLUMN IF NOT EXISTS analyzed_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS blessings_quality_score_idx
  ON public.blessings (quality_score DESC NULLS LAST);