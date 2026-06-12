
ALTER TABLE public.blessings
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rejected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderation_token text;

UPDATE public.blessings
SET moderation_token = gen_random_uuid()::text
WHERE moderation_token IS NULL;

ALTER TABLE public.blessings
  ALTER COLUMN moderation_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS blessings_moderation_token_key
  ON public.blessings(moderation_token);

GRANT SELECT ON public.blessings TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view approved blessings" ON public.blessings;
CREATE POLICY "Public can view approved blessings"
  ON public.blessings
  FOR SELECT
  TO anon, authenticated
  USING (approved = true AND rejected = false);
