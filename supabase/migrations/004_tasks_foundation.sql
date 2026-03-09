-- ==========================================
-- 004_tasks_foundation.sql
-- ==========================================

CREATE TABLE IF NOT EXISTS public.task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    default_display_mode TEXT DEFAULT 'full',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_template_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_template_id UUID REFERENCES public.task_templates(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID REFERENCES public.task_template_sections(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sort_order INT DEFAULT 0,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_template_id UUID REFERENCES public.task_templates(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    assignment_date DATE NOT NULL,
    display_mode TEXT DEFAULT 'full',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_assignment_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_assignment_id UUID REFERENCES public.task_assignments(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL DEFAULT 'employee',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_item_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_assignment_id UUID REFERENCES public.task_assignments(id) ON DELETE CASCADE,
    task_template_item_id UUID REFERENCES public.task_template_items(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'completed',
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignment_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_item_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage templates" ON public.task_templates FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can manage template sections" ON public.task_template_sections FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can manage template items" ON public.task_template_items FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Crew can view their assigned tasks" ON public.task_assignments FOR SELECT 
USING (
    id IN (SELECT task_assignment_id FROM public.task_assignment_targets WHERE employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can manage assignments" ON public.task_assignments FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Crew can view target maps" ON public.task_assignment_targets FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admins can manage target maps" ON public.task_assignment_targets FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Crew can log their own task items" ON public.task_item_logs FOR INSERT 
WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Crew can view their assigned task logs" ON public.task_item_logs FOR SELECT 
USING (
    task_assignment_id IN (SELECT task_assignment_id FROM public.task_assignment_targets WHERE employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can manage task logs" ON public.task_item_logs FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
