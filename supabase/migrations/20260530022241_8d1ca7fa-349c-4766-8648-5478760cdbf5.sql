
CREATE TABLE public.blessings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  note TEXT NOT NULL,
  recipient_email TEXT NOT NULL DEFAULT 'riowedszonu@email.com',
  email_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.blessings TO anon;
GRANT SELECT, INSERT ON public.blessings TO authenticated;
GRANT ALL ON public.blessings TO service_role;

ALTER TABLE public.blessings ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated visitors) can submit a blessing
CREATE POLICY "Anyone can insert blessings"
ON public.blessings FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(name)) BETWEEN 1 AND 80
  AND length(trim(note)) BETWEEN 1 AND 500
);

-- No SELECT policy for anon → submissions are write-only for the public.
-- Service role bypasses RLS and can read them server-side.
