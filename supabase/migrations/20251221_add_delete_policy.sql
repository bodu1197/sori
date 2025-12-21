-- Migration: Add delete policy for playlists table
-- Date: 2024-12-21
-- Description: Allow users to delete their own playlists (liked songs)

-- Add DELETE policy for playlists
CREATE POLICY "Users can delete their own playlists."
  ON playlists FOR DELETE
  USING ( auth.uid() = user_id );
