-- ==========================================
-- 010_task_assignments_rls_fix.sql
-- Fixes capability checks across all task assignment tables.
-- The previous RLS policies incorrectly checked `rc.capability_id = 'manage_tasks'`.
-- Since capability_id is a UUID, we must join `capabilities` and check `c.code = 'manage_tasks'`.
-- This migration updates `task_assignments`, `task_assignment_instances`, and `task_assignment_instance_targets`.
-- ==========================================

-- 1. TASK ASSIGNMENTS

DROP POLICY IF EXISTS "Admins can manage assignments" ON public.task_assignments;
DROP POLICY IF EXISTS "Delete task assignments" ON public.task_assignments;
DROP POLICY IF EXISTS "Insert task assignments" ON public.task_assignments;
DROP POLICY IF EXISTS "Update task assignments" ON public.task_assignments;
DROP POLICY IF EXISTS "View task assignments" ON public.task_assignments;

CREATE POLICY "View task assignments" ON public.task_assignments FOR SELECT 
USING (
    id IN (SELECT task_assignment_id FROM public.task_assignment_targets WHERE employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()))
    OR EXISTS (
        SELECT 1 FROM public.employee_roles er 
        JOIN public.role_capabilities rc ON er.role_id = rc.role_id JOIN public.capabilities c ON rc.capability_id = c.id
        WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) AND c.code = 'manage_tasks'
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Insert task assignments" ON public.task_assignments FOR INSERT 
WITH CHECK (
    EXISTS (SELECT 1 FROM public.employee_roles er JOIN public.role_capabilities rc ON er.role_id = rc.role_id JOIN public.capabilities c ON rc.capability_id = c.id WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) AND c.code = 'manage_tasks')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Update task assignments" ON public.task_assignments FOR UPDATE 
USING (
    EXISTS (SELECT 1 FROM public.employee_roles er JOIN public.role_capabilities rc ON er.role_id = rc.role_id JOIN public.capabilities c ON rc.capability_id = c.id WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) AND c.code = 'manage_tasks')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.employee_roles er JOIN public.role_capabilities rc ON er.role_id = rc.role_id JOIN public.capabilities c ON rc.capability_id = c.id WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) AND c.code = 'manage_tasks')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Delete task assignments" ON public.task_assignments FOR DELETE 
USING (
    EXISTS (SELECT 1 FROM public.employee_roles er JOIN public.role_capabilities rc ON er.role_id = rc.role_id JOIN public.capabilities c ON rc.capability_id = c.id WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) AND c.code = 'manage_tasks')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 2. TASK ASSIGNMENT INSTANCES

DROP POLICY IF EXISTS "Task managers can manage task instances" ON public.task_assignment_instances;
DROP POLICY IF EXISTS "Crew can view their assigned task instances" ON public.task_assignment_instances;
DROP POLICY IF EXISTS "Delete task instances" ON public.task_assignment_instances;
DROP POLICY IF EXISTS "Insert task instances" ON public.task_assignment_instances;
DROP POLICY IF EXISTS "Update task instances" ON public.task_assignment_instances;
DROP POLICY IF EXISTS "View task instances" ON public.task_assignment_instances;

CREATE POLICY "View task instances" ON public.task_assignment_instances FOR SELECT 
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
        JOIN public.role_capabilities rc ON er.role_id = rc.role_id JOIN public.capabilities c ON rc.capability_id = c.id
        WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) AND c.code = 'manage_tasks'
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Insert task instances" ON public.task_assignment_instances FOR INSERT 
WITH CHECK (
    EXISTS (SELECT 1 FROM public.employee_roles er JOIN public.role_capabilities rc ON er.role_id = rc.role_id JOIN public.capabilities c ON rc.capability_id = c.id WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) AND c.code = 'manage_tasks')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Update task instances" ON public.task_assignment_instances FOR UPDATE 
USING (
    EXISTS (SELECT 1 FROM public.employee_roles er JOIN public.role_capabilities rc ON er.role_id = rc.role_id JOIN public.capabilities c ON rc.capability_id = c.id WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) AND c.code = 'manage_tasks')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.employee_roles er JOIN public.role_capabilities rc ON er.role_id = rc.role_id JOIN public.capabilities c ON rc.capability_id = c.id WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) AND c.code = 'manage_tasks')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Delete task instances" ON public.task_assignment_instances FOR DELETE 
USING (
    EXISTS (SELECT 1 FROM public.employee_roles er JOIN public.role_capabilities rc ON er.role_id = rc.role_id JOIN public.capabilities c ON rc.capability_id = c.id WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) AND c.code = 'manage_tasks')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. TASK ASSIGNMENT INSTANCE TARGETS

DROP POLICY IF EXISTS "Task managers can manage instance targets" ON public.task_assignment_instance_targets;
DROP POLICY IF EXISTS "Crew can view instance targets" ON public.task_assignment_instance_targets;
DROP POLICY IF EXISTS "Delete instance targets" ON public.task_assignment_instance_targets;
DROP POLICY IF EXISTS "Insert instance targets" ON public.task_assignment_instance_targets;
DROP POLICY IF EXISTS "Update instance targets" ON public.task_assignment_instance_targets;
DROP POLICY IF EXISTS "View instance targets" ON public.task_assignment_instance_targets;

CREATE POLICY "View instance targets" ON public.task_assignment_instance_targets FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Insert instance targets" ON public.task_assignment_instance_targets FOR INSERT 
WITH CHECK (
    EXISTS (SELECT 1 FROM public.employee_roles er JOIN public.role_capabilities rc ON er.role_id = rc.role_id JOIN public.capabilities c ON rc.capability_id = c.id WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) AND c.code = 'manage_tasks')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Update instance targets" ON public.task_assignment_instance_targets FOR UPDATE 
USING (
    EXISTS (SELECT 1 FROM public.employee_roles er JOIN public.role_capabilities rc ON er.role_id = rc.role_id JOIN public.capabilities c ON rc.capability_id = c.id WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) AND c.code = 'manage_tasks')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.employee_roles er JOIN public.role_capabilities rc ON er.role_id = rc.role_id JOIN public.capabilities c ON rc.capability_id = c.id WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) AND c.code = 'manage_tasks')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Delete instance targets" ON public.task_assignment_instance_targets FOR DELETE 
USING (
    EXISTS (SELECT 1 FROM public.employee_roles er JOIN public.role_capabilities rc ON er.role_id = rc.role_id JOIN public.capabilities c ON rc.capability_id = c.id WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) AND c.code = 'manage_tasks')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
