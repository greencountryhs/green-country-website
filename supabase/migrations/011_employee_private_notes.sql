-- ==========================================
-- 011_employee_private_notes.sql
-- Employee private notepad v1 (employee-only)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.employee_private_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_private_notes_employee_created_at
ON public.employee_private_notes (employee_id, created_at DESC);

ALTER TABLE public.employee_private_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can read own private notes" ON public.employee_private_notes FOR SELECT
USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Employees can create own private notes" ON public.employee_private_notes FOR INSERT
WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Employees can update own private notes" ON public.employee_private_notes FOR UPDATE
USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()))
WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Employees can delete own private notes" ON public.employee_private_notes FOR DELETE
USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.set_employee_private_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employee_private_notes_updated_at ON public.employee_private_notes;
CREATE TRIGGER trg_employee_private_notes_updated_at
BEFORE UPDATE ON public.employee_private_notes
FOR EACH ROW
EXECUTE FUNCTION public.set_employee_private_notes_updated_at();
