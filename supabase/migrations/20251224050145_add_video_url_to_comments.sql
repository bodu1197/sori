-- Add video_url column to post_comments
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Create comment-media storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('comment-media', 'comment-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read comment media" ON storage.objects
FOR SELECT USING (bucket_id = 'comment-media');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated upload comment media" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'comment-media');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own comment media" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'comment-media' AND auth.uid()::text = (storage.foldername(name))[2]);
