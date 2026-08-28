ALTER TABLE public.gallery_media
  ADD COLUMN IF NOT EXISTS uploaded_by uuid,
  ADD COLUMN IF NOT EXISTS uploaded_by_label text,
  ADD COLUMN IF NOT EXISTS rejection_reason text;