-- Ensure the site-content storage bucket exists and is configured for public read access.

INSERT INTO storage.buckets (id, name, public)
VALUES ('site-content', 'site-content', true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = true;

-- Drop existing policies to avoid duplicates when re-running migrations.
DROP POLICY IF EXISTS "Public read access for site-content" ON storage.objects;
DROP POLICY IF EXISTS "Admins or facilitators manage site-content inserts" ON storage.objects;
DROP POLICY IF EXISTS "Admins or facilitators manage site-content updates" ON storage.objects;
DROP POLICY IF EXISTS "Admins or facilitators manage site-content deletes" ON storage.objects;

-- Allow anyone to read objects stored in the site-content bucket.
CREATE POLICY "Public read access for site-content"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'site-content');

-- Allow admins or facilitators to insert new objects into the bucket.
CREATE POLICY "Admins or facilitators manage site-content inserts"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'site-content'
    AND EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.auth_id = auth.uid()
        AND (users.is_admin = true OR users.is_facilitator = true)
    )
  );

-- Allow admins or facilitators to update objects in the bucket.
CREATE POLICY "Admins or facilitators manage site-content updates"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'site-content'
    AND EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.auth_id = auth.uid()
        AND (users.is_admin = true OR users.is_facilitator = true)
    )
  )
  WITH CHECK (
    bucket_id = 'site-content'
    AND EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.auth_id = auth.uid()
        AND (users.is_admin = true OR users.is_facilitator = true)
    )
  );

-- Allow admins or facilitators to delete objects from the bucket.
CREATE POLICY "Admins or facilitators manage site-content deletes"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'site-content'
    AND EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.auth_id = auth.uid()
        AND (users.is_admin = true OR users.is_facilitator = true)
    )
  );

