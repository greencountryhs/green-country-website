-- ==========================================
-- 008_task_assignment_sequences.sql
-- ==========================================

-- 1. Create Task Assignment Sequences (Optional grouping layer for multi-day plans)
CREATE TABLE IF NOT EXISTS public.task_assignment_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.employees(id)
);

-- 2. Add sequence_id to legacy assignments layer (for back-compat / linking of definitions)
ALTER TABLE public.task_assignments 
ADD COLUMN IF NOT EXISTS sequence_id UUID REFERENCES public.task_assignment_sequences(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sequence_order INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS sequence_key TEXT,
ADD COLUMN IF NOT EXISTS planning_mode TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Add sequence fields to the core instances layer (groups multiple distinct concrete instances)
ALTER TABLE public.task_assignment_instances
ADD COLUMN IF NOT EXISTS sequence_id UUID REFERENCES public.task_assignment_sequences(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sequence_order INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS sequence_key TEXT;

-- 4. Enable RLS
ALTER TABLE public.task_assignment_sequences ENABLE ROW LEVEL SECURITY;

-- 5. Sequence Policies
CREATE POLICY "Crew can view sequences" ON public.task_assignment_sequences FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Task managers can manage sequences" ON public.task_assignment_sequences FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.employee_roles er 
        JOIN public.role_capabilities rc ON er.role_id = rc.role_id 
        WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) 
        AND rc.capability_id = 'manage_tasks'
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
