-- ==========================================
-- 012_manager_note_replies.sql
-- Crew replies to manager notes (minimal v1)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.manager_note_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_note_id UUID NOT NULL REFERENCES public.manager_notes(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manager_note_replies_note_created
ON public.manager_note_replies (manager_note_id, created_at);

ALTER TABLE public.manager_note_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manager_note_replies_insert_recipient"
ON public.manager_note_replies
FOR INSERT
WITH CHECK (
    employee_id = current_employee_id()
    AND EXISTS (
        SELECT 1
        FROM public.manager_note_reads mnr
        WHERE mnr.manager_note_id = manager_note_replies.manager_note_id
          AND mnr.employee_id = current_employee_id()
    )
);

CREATE POLICY "manager_note_replies_select_recipient_or_managers"
ON public.manager_note_replies
FOR SELECT
USING (
    employee_id = current_employee_id()
    OR user_has_capability('post_manager_notes'::text)
);