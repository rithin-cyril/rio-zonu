
-- Add ordering and edit-tracking columns
ALTER TABLE public.blessings
  ADD COLUMN IF NOT EXISTS sort_order integer,
  ADD COLUMN IF NOT EXISTS last_edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_edited_by uuid;

-- Backfill sort_order based on created_at
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM public.blessings
  WHERE sort_order IS NULL
)
UPDATE public.blessings b SET sort_order = r.rn
FROM ranked r WHERE b.id = r.id;

-- Auto-assign sort_order on insert (place at bottom)
CREATE OR REPLACE FUNCTION public.blessings_set_sort_order()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.sort_order IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO NEW.sort_order FROM public.blessings;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blessings_set_sort_order ON public.blessings;
CREATE TRIGGER trg_blessings_set_sort_order
BEFORE INSERT ON public.blessings
FOR EACH ROW EXECUTE FUNCTION public.blessings_set_sort_order();

CREATE INDEX IF NOT EXISTS blessings_sort_order_idx ON public.blessings(sort_order);

-- Version history table
CREATE TABLE IF NOT EXISTS public.blessing_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blessing_id uuid NOT NULL REFERENCES public.blessings(id) ON DELETE CASCADE,
  version integer NOT NULL,
  name text NOT NULL,
  note text NOT NULL,
  status text NOT NULL,
  edited_by uuid,
  edited_by_label text,
  change_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.blessing_versions TO authenticated;
GRANT ALL ON public.blessing_versions TO service_role;

ALTER TABLE public.blessing_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view blessing versions"
ON public.blessing_versions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS blessing_versions_blessing_id_idx
  ON public.blessing_versions(blessing_id, version DESC);
