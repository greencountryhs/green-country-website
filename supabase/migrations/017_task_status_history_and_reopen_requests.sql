-- ==========================================
-- 017_task_status_history_and_reopen_requests.sql
-- Adds audited task status transitions and reopen requests.
-- ==========================================

CREATE TABLE IF NOT EXISTS public.task_instance_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_assignment_instance_id UUID NOT NULL REFERENCES public.task_assignment_instances(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  change_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_status_history_instance_id
  ON public.task_instance_status_history(task_assignment_instance_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.task_status_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_assignment_instance_id UUID NOT NULL REFERENCES public.task_assignment_instances(id) ON DELETE CASCADE,
  requested_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_by_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  requested_status TEXT NOT NULL DEFAULT 'reopened',
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending / approved / rejected
  reviewed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_status_change_requests_instance_id
  ON public.task_status_change_requests(task_assignment_instance_id, created_at DESC);

ALTER TABLE public.task_instance_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_status_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View task status history" ON public.task_instance_status_history;
CREATE POLICY "View task status history" ON public.task_instance_status_history
FOR SELECT
USING (
  task_assignment_instance_id IN (
    SELECT task_assignment_instance_id
    FROM public.task_assignment_instance_targets
    WHERE (target_type = 'employee' AND employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()))
       OR (target_type = 'all_crew')
       OR (target_type = 'role' AND role_id IN (
         SELECT role_id FROM public.employee_roles WHERE employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
       ))
  )
  OR EXISTS (
    SELECT 1
    FROM public.employee_roles er
    JOIN public.role_capabilities rc ON er.role_id = rc.role_id
    JOIN public.capabilities c ON rc.capability_id = c.id
    WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
      AND c.code = 'manage_tasks'
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "Task managers can manage task status history" ON public.task_instance_status_history;
CREATE POLICY "Task managers can manage task status history" ON public.task_instance_status_history
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.employee_roles er
    JOIN public.role_capabilities rc ON er.role_id = rc.role_id
    JOIN public.capabilities c ON rc.capability_id = c.id
    WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
      AND c.code = 'manage_tasks'
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.employee_roles er
    JOIN public.role_capabilities rc ON er.role_id = rc.role_id
    JOIN public.capabilities c ON rc.capability_id = c.id
    WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
      AND c.code = 'manage_tasks'
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "Crew can request task status changes" ON public.task_status_change_requests;
CREATE POLICY "Crew can request task status changes" ON public.task_status_change_requests
FOR INSERT
WITH CHECK (
  requested_by_user_id = auth.uid()
  AND task_assignment_instance_id IN (
    SELECT task_assignment_instance_id
    FROM public.task_assignment_instance_targets
    WHERE (target_type = 'employee' AND employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()))
       OR (target_type = 'all_crew')
       OR (target_type = 'role' AND role_id IN (
         SELECT role_id FROM public.employee_roles WHERE employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
       ))
  )
);

DROP POLICY IF EXISTS "Crew can view own task status change requests" ON public.task_status_change_requests;
CREATE POLICY "Crew can view own task status change requests" ON public.task_status_change_requests
FOR SELECT
USING (
  requested_by_user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.employee_roles er
    JOIN public.role_capabilities rc ON er.role_id = rc.role_id
    JOIN public.capabilities c ON rc.capability_id = c.id
    WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
      AND c.code = 'manage_tasks'
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "Task managers can manage status change requests" ON public.task_status_change_requests;
CREATE POLICY "Task managers can manage status change requests" ON public.task_status_change_requests
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.employee_roles er
    JOIN public.role_capabilities rc ON er.role_id = rc.role_id
    JOIN public.capabilities c ON rc.capability_id = c.id
    WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
      AND c.code = 'manage_tasks'
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.employee_roles er
    JOIN public.role_capabilities rc ON er.role_id = rc.role_id
    JOIN public.capabilities c ON rc.capability_id = c.id
    WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
      AND c.code = 'manage_tasks'
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
