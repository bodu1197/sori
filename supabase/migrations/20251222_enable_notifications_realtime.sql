-- Enable Realtime for notifications table
-- This allows real-time notifications to be delivered to users

-- Set REPLICA IDENTITY to FULL for the notifications table
-- This is required for Realtime to work properly
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- Add notifications table to the realtime publication
-- This enables Postgres changes to be broadcasted via Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
