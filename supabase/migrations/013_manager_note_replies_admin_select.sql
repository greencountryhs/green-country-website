-- Prerequisite: public.manager_note_replies must exist (created in 012_manager_note_replies.sql).
-- If you see "relation does not exist", run 012 first in the SQL editor, then this file.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'manager_note_replies'
  ) THEN
    RAISE EXCEPTION
      'public.manager_note_replies does not exist. Apply migration 012_manager_note_replies.sql first, then re-run this migration.';
  END IF;
END $$;

-- Ensure admins can SELECT manager_note_replies even if "Managers can read all replies"
-- was not applied or failed to create on a given environment.

CREATE POLICY "Admin users can read manager_note_replies"
ON public.manager_note_replies
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
