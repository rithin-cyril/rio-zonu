-- Remove permissive policies that exposed sensitive columns and allowed
-- anonymous moderation-field manipulation. All reads/writes happen through
-- server functions using the service role, which bypasses RLS.
DROP POLICY IF EXISTS "Public can view approved blessings" ON public.blessings;
DROP POLICY IF EXISTS "Anyone can insert blessings" ON public.blessings;

-- Revoke direct Data API access from anon/authenticated.
REVOKE ALL ON public.blessings FROM anon;
REVOKE ALL ON public.blessings FROM authenticated;

-- Ensure server-side admin code retains full access.
GRANT ALL ON public.blessings TO service_role;