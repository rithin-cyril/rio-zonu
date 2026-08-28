CREATE TABLE public.gallery_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('photo','video')),
  category text NOT NULL DEFAULT 'wedding' CHECK (category IN ('pre-wedding','wedding','post-wedding')),
  caption text NOT NULL DEFAULT '',
  original_path text,
  public_path text,
  poster_path text,
  bucket_public text NOT NULL DEFAULT 'gallery-public',
  width integer,
  height integer,
  duration_seconds numeric,
  bytes_original bigint NOT NULL DEFAULT 0,
  bytes_public bigint NOT NULL DEFAULT 0,
  bytes_poster bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading','processing','ready','failed')),
  error text,
  published boolean NOT NULL DEFAULT false,
  sort_order integer,
  source text NOT NULL DEFAULT 'admin' CHECK (source IN ('admin','guest')),
  approval_status text NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending','approved','rejected')),
  submitter_name text,
  submitter_ip text,
  submitter_ua text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_by_label text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gallery_media TO authenticated;
GRANT ALL ON public.gallery_media TO service_role;

ALTER TABLE public.gallery_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view gallery media"
  ON public.gallery_media FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE INDEX idx_gallery_media_public
  ON public.gallery_media (category, sort_order, created_at)
  WHERE published = true AND status = 'ready' AND approval_status = 'approved';

CREATE INDEX idx_gallery_media_pending ON public.gallery_media (approval_status, submitted_at DESC);
CREATE INDEX idx_gallery_media_ip ON public.gallery_media (submitter_ip, submitted_at DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_gallery_media_updated_at
  BEFORE UPDATE ON public.gallery_media
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_settings (key, value)
VALUES ('gallery_visible', '{"show": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;