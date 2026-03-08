-- ==========================================
-- 002_projects_backbone.sql
-- ==========================================

CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Clients RLS
CREATE POLICY "Admins can manage clients" ON public.clients FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users with capability can view clients" ON public.clients FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.employee_roles er 
        JOIN public.role_capabilities rc ON er.role_id = rc.role_id 
        WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) 
        AND rc.capability_id = 'view_all_projects'
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Projects RLS
CREATE POLICY "Admins can manage projects" ON public.projects FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users with capability can view projects" ON public.projects FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.employee_roles er 
        JOIN public.role_capabilities rc ON er.role_id = rc.role_id 
        WHERE er.employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) 
        AND rc.capability_id IN ('view_all_projects', 'assign_tasks')
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
