-- ==========================================
-- 001_permissions_foundation.sql
-- Creates the capability-based permission architecture.
-- ==========================================

-- 1. Create tables
CREATE TABLE IF NOT EXISTS public.roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.capabilities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_capabilities (
    role_id TEXT REFERENCES public.roles(id) ON DELETE CASCADE,
    capability_id TEXT REFERENCES public.capabilities(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (role_id, capability_id)
);

CREATE TABLE IF NOT EXISTS public.employee_roles (
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    role_id TEXT REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (employee_id, role_id)
);

-- 2. Seed default roles
INSERT INTO public.roles (id, name, description)
VALUES 
    ('admin', 'Administrator', 'Full system access'),
    ('manager', 'Manager', 'Can manage crew, tasks, and notes'),
    ('crew_lead', 'Crew Lead', 'Can assign tasks and view project details'),
    ('crew_member', 'Crew Member', 'Standard crew access for logging time and tasks')
ON CONFLICT (id) DO NOTHING;

-- 3. Seed capabilities
INSERT INTO public.capabilities (id, name, description)
VALUES 
    ('manage_crew', 'Manage Crew', 'Can add/edit crew members'),
    ('manage_tasks', 'Manage Tasks', 'Can create and edit daily tasks and templates'),
    ('assign_tasks', 'Assign Tasks', 'Can assign tasks to crew members'),
    ('view_project_notes', 'View Project Notes', 'Can view notes tied to projects'),
    ('post_manager_notes', 'Post Manager Notes', 'Can post notes to the manager inbox'),
    ('view_payroll_summary', 'View Payroll Summary', 'Can view company payroll summary'),
    ('record_payments', 'Record Payments', 'Can record payments made to crew'),
    ('manage_comp_adjustments', 'Manage Comp Adjustments', 'Can create compensation adjustments'),
    ('view_job_costs', 'View Job Costs', 'Can view financial job costs'),
    ('manage_estimates', 'Manage Estimates', 'Can manage project estimates'),
    ('view_all_projects', 'View All Projects', 'Can view all projects regardless of assignment'),
    ('view_own_hours', 'View Own Hours', 'Can view own recorded hours')
ON CONFLICT (id) DO NOTHING;

-- 4. Seed initial role_capabilities
-- (This is just a starting point; you can adjust in the UI later once built)
-- Admin gets everything
INSERT INTO public.role_capabilities (role_id, capability_id)
SELECT 'admin', id FROM public.capabilities
ON CONFLICT DO NOTHING;

-- Manager
INSERT INTO public.role_capabilities (role_id, capability_id)
VALUES 
    ('manager', 'manage_crew'),
    ('manager', 'manage_tasks'),
    ('manager', 'assign_tasks'),
    ('manager', 'view_project_notes'),
    ('manager', 'post_manager_notes'),
    ('manager', 'view_all_projects')
ON CONFLICT DO NOTHING;

-- Crew Lead
INSERT INTO public.role_capabilities (role_id, capability_id)
VALUES 
    ('crew_lead', 'assign_tasks'),
    ('crew_lead', 'view_project_notes'),
    ('crew_lead', 'view_own_hours')
ON CONFLICT DO NOTHING;

-- Crew Member
INSERT INTO public.role_capabilities (role_id, capability_id)
VALUES 
    ('crew_member', 'view_own_hours')
ON CONFLICT DO NOTHING;

-- 5. Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_roles ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- Everyone authenticated can READ roles, capabilities, and role_capabilities to construct their permissions
CREATE POLICY "Allow authenticated users to read roles" ON public.roles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to read capabilities" ON public.capabilities FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to read role_capabilities" ON public.role_capabilities FOR SELECT USING (auth.role() = 'authenticated');

-- Everyone can read their OWN employee_roles, Admins can read/write ALL
CREATE POLICY "Users can read own employee_roles" ON public.employee_roles FOR SELECT 
USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage employee_roles" ON public.employee_roles FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage roles" ON public.roles FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage capabilities" ON public.capabilities FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage role_capabilities" ON public.role_capabilities FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
