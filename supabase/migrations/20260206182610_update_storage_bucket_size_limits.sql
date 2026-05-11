/*
  # Update Storage Bucket Size Limits

  1. Storage Configuration
    - Set max file size to 5MB (5242880 bytes) for avatars bucket
    - Set max file size to 5MB for house-images bucket
    - Add allowed MIME types for image uploads

  2. Security
    - Enforce file size limits at storage bucket level
    - Restrict file types to images only
*/

-- Update avatars bucket with size limit and allowed types
UPDATE storage.buckets
SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
WHERE id = 'avatars';

-- Update house-images bucket with size limit and allowed types
UPDATE storage.buckets
SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
WHERE id = 'house-images';
