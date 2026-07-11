-- Fix merchant logo uploads: upsert requires SELECT + UPDATE with_check.
-- Scope writes to the merchant folder owned by auth.uid().

DROP POLICY IF EXISTS "Merchants can upload their own assets" ON storage.objects;
DROP POLICY IF EXISTS "Merchants can update their own assets" ON storage.objects;
DROP POLICY IF EXISTS "Merchants can delete their own assets" ON storage.objects;
DROP POLICY IF EXISTS "Merchant assets public read" ON storage.objects;
DROP POLICY IF EXISTS "Merchants upload own logo" ON storage.objects;
DROP POLICY IF EXISTS "Merchants update own logo" ON storage.objects;
DROP POLICY IF EXISTS "Merchants delete own logo" ON storage.objects;

CREATE POLICY "Merchant assets public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'merchant-assets');

CREATE POLICY "Merchants upload own logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'merchant-assets'
  AND (storage.foldername(name))[1] = 'merchants'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT id FROM public.merchants WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Merchants update own logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'merchant-assets'
  AND (storage.foldername(name))[1] = 'merchants'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT id FROM public.merchants WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'merchant-assets'
  AND (storage.foldername(name))[1] = 'merchants'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT id FROM public.merchants WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Merchants delete own logo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'merchant-assets'
  AND (storage.foldername(name))[1] = 'merchants'
  AND (storage.foldername(name))[2]::uuid IN (
    SELECT id FROM public.merchants WHERE owner_id = auth.uid()
  )
);
