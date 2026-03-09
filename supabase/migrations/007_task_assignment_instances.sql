-- ==========================================
-- 007_task_assignment_instances.sql
-- ==========================================

-- 1. Create task_assignment_instances
CREATE TABLE IF NOT EXISTS public.task_assignment_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_assignment_id UUID REFERENCES public.task_assignments(id) ON DELETE CASCADE,
    assignment_date DATE NOT NULL,
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'active', 'completed', 'cancelled'
    title TEXT, -- Snapshot of assignment name or custom override
    is_override BOOLEAN DEFAULT false,
    display_mode TEXT DEFAULT 'full', -- Snapshot of parent mode or override
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create task_assignment_instance_targets
CREATE TABLE IF NOT EXISTS public.task_assignment_instance_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_assignment_instance_id UUID REFERENCES public.task_assignment_instances(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL DEFAULT 'employee', -- 'employee', 'all_crew', 'role'
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add instance linkage to logs
ALTER TABLE public.task_item_logs 
ADD COLUMN IF NOT EXISTS task_assignment_instance_id UUID REFERENCES public.task_assignment_instances(id) ON DELETE CASCADE;

-- 4. Enable RLS
ALTER TABLE public.task_assignment_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignment_instance_targets ENABLE ROW LEVEL SECURITY;

-- 5. Backfill existing data
-- A. Create instances from legacy assignments
INSERT INTO public.task_assignment_instances (task_assignment_id, assignment_date, title, display_mode)
SELECT id, assignment_date, title, display_mode
FROM public.task_assignments
ON CONFLICT DO NOTHING;

-- B. Create instance targets from legacy targets
INSERT INTO public.task_assignment_instance_targets (task_assignment_instance_id, target_type, employee_id, role_id)
SELECT i.id, t.target_type, t.employee_id, t.role_id
FROM public.task_assignment_targets t
JOIN public.task_assignment_instances i ON i.task_assignment_id = t.task_assignment_id
ON CONFLICT DO NOTHING;

-- C. Backfill task_item_logs instance IDs (optimistic mapping matching by task_assignment_id)
UPDATE public.task_item_logs l
SET task_assignment_instance_id = i.id
FROM public.task_assignment_instances i
WHERE l.task_assignment_id = i.task_assignment_id
AND l.task_assignment_instance_id IS NULL;


-- 6. RLS Policies (Aligning with existing manage_tasks style)

-- Instances
-- Crew can see instances targeted to them (via employee_id, role, or all_crew)
CREATE POLICY "Crew can view their assigned task instances" ON public.task_assignment_instances FOR SELECT 
USING (
    id IN (
        SELECT task_assignment_instance_id FROM public.task_assignment_instance_targets 
        WHERE (target_type = 'employee' AND employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()))
           OR (target_type = 'all_crew')
           OR (target_type = 'role' AND role_id IN (
               SELECT role_id FROM public.employee_roles WHERE employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
           ))
    )
    OR EXISTS (
        SELECT 1 FROM public.employee_roles er 
        JOIN public.role_capabilities rc ON er.role_id = rc.role_id 
        WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) 
        AND rc.capability_id = 'manage_tasks'
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Task managers can manage task instances" ON public.task_assignment_instances FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.employee_roles er 
        JOIN public.role_capabilities rc ON er.role_id = rc.role_id 
        WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) 
        AND rc.capability_id = 'manage_tasks'
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);


-- Instance Targets
CREATE POLICY "Crew can view instance targets" ON public.task_assignment_instance_targets FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Task managers can manage instance targets" ON public.task_assignment_instance_targets FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.employee_roles er 
        JOIN public.role_capabilities rc ON er.role_id = rc.role_id 
        WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) 
        AND rc.capability_id = 'manage_tasks'
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
