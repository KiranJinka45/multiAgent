-- Enable Realtime for the required tables
-- This ensures that the 'supabase_realtime' publication exists and tracks our core tables.

BEGIN;
  -- Create the publication if it doesn't exist
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END $$;

  -- Add tables individually with existence checks to avoid 'already member' errors
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'projects') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
    END IF;
  END $$;

  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'project_files') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.project_files;
    END IF;
  END $$;

  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chats') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
    END IF;
  END $$;

  -- Ensure replica identity is set to FULL (idempotent)
  ALTER TABLE public.projects REPLICA IDENTITY FULL;
  ALTER TABLE public.project_files REPLICA IDENTITY FULL;
  ALTER TABLE public.chats REPLICA IDENTITY FULL;

COMMIT;
