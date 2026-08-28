-- 1) Narrow the admin check to genuine admin roles
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin', 'super_admin', 'administrator')
  )
$function$;

-- Helper for moderation-capable roles (admins + moderators)
CREATE OR REPLACE FUNCTION public.is_moderator_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin', 'super_admin', 'administrator', 'moderator')
  )
$function$;

-- 2) gallery_media: keep admin/moderator full read, add narrow public read of published media
DROP POLICY IF EXISTS "Admins can view gallery media" ON public.gallery_media;
CREATE POLICY "Admins and moderators can view gallery media"
ON public.gallery_media
FOR SELECT
TO authenticated
USING (public.is_moderator_user(auth.uid()));

CREATE POLICY "Public can view published approved gallery media"
ON public.gallery_media
FOR SELECT
TO anon, authenticated
USING (published = true AND approval_status = 'approved' AND status = 'ready');

-- Column-scoped grants so submitter IP/user-agent and internal errors stay private
REVOKE ALL ON public.gallery_media FROM anon;
GRANT SELECT (
  id, kind, category, caption, public_path, poster_path, bucket_public,
  width, height, duration_seconds, published, approval_status, status,
  sort_order, created_at
) ON public.gallery_media TO anon;
GRANT SELECT ON public.gallery_media TO authenticated;
GRANT ALL ON public.gallery_media TO service_role;

-- 3) Lock down storage.objects for the gallery buckets
DROP POLICY IF EXISTS "Gallery buckets: staff read" ON storage.objects;
DROP POLICY IF EXISTS "Gallery buckets: staff insert" ON storage.objects;
DROP POLICY IF EXISTS "Gallery buckets: staff update" ON storage.objects;
DROP POLICY IF EXISTS "Gallery buckets: staff delete" ON storage.objects;

CREATE POLICY "Gallery buckets: staff read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('gallery-public', 'gallery-private') AND public.is_moderator_user(auth.uid()));

CREATE POLICY "Gallery buckets: staff insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('gallery-public', 'gallery-private') AND public.is_moderator_user(auth.uid()));

CREATE POLICY "Gallery buckets: staff update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('gallery-public', 'gallery-private') AND public.is_moderator_user(auth.uid()))
WITH CHECK (bucket_id IN ('gallery-public', 'gallery-private') AND public.is_moderator_user(auth.uid()));

CREATE POLICY "Gallery buckets: staff delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('gallery-public', 'gallery-private') AND public.is_moderator_user(auth.uid()));