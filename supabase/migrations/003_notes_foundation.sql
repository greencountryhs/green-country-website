-- ==========================================
-- 003_notes_foundation.sql
-- ==========================================

CREATE TABLE IF NOT EXISTS public.employee_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.manager_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'normal',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.manager_note_reads (
    note_id UUID REFERENCES public.manager_notes(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ,
    PRIMARY KEY (note_id, employee_id)
);

CREATE TABLE IF NOT EXISTS public.project_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    visibility TEXT DEFAULT 'crew_visible', -- 'crew_visible' or 'manager_only'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.employee_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_note_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

-- employee_notes
CREATE POLICY "Crew can CRUD own notes" ON public.employee_notes FOR ALL 
USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- manager_notes
CREATE POLICY "Authors can create manager notes" ON public.manager_notes FOR INSERT 
WITH CHECK (author_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Crew can read manager notes if recipient" ON public.manager_notes FOR SELECT 
USING (
    id IN (SELECT note_id FROM public.manager_note_reads WHERE employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can manage all manager notes" ON public.manager_notes FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- manager_note_reads
CREATE POLICY "Crew can read own receipts" ON public.manager_note_reads FOR SELECT 
USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Crew can update own receipts (mark read)" ON public.manager_note_reads FOR UPDATE 
USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Managers can insert receipts" ON public.manager_note_reads FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.employee_roles er 
        JOIN public.role_capabilities rc ON er.role_id = rc.role_id 
        WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) 
        AND rc.capability_id = 'post_manager_notes'
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can read all receipts" ON public.manager_note_reads FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- project_notes
CREATE POLICY "Crew can view crew_visible project notes" ON public.project_notes FOR SELECT 
USING (
    visibility = 'crew_visible' 
    OR EXISTS (
        SELECT 1 FROM public.employee_roles er 
        JOIN public.role_capabilities rc ON er.role_id = rc.role_id 
        WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) 
        AND rc.capability_id = 'view_project_notes'
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can manage project notes" ON public.project_notes FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
