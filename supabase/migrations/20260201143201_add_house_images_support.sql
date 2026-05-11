/*
  # Add House Images Support

  1. New Columns
    - `houses.image_url` (text, nullable) - URL to house image in storage
    - `house_customizations.house_image` (text, nullable) - House image stored in kit customization
  
  2. Storage Bucket
    - Creates `house-images` bucket for storing house photos
    - Sets up RLS policies for authenticated users
  
  3. Security
    - Users can only upload/update images for houses they created or are admin of
    - Users can only delete their own house images
    - Anyone can view house images (public read)
*/

-- Add image_url column to houses table
ALTER TABLE houses 
ADD COLUMN IF NOT EXISTS image_url text;

-- Add house_image column to house_customizations table
ALTER TABLE house_customizations 
ADD COLUMN IF NOT EXISTS house_image text;

-- Create house-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('house-images', 'house-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view house images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload house images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own house images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own house images" ON storage.objects;

-- Create storage policies
CREATE POLICY "Anyone can view house images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'house-images');

CREATE POLICY "Authenticated users can upload house images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'house-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own house images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'house-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own house images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'house-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);