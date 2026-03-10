-- 009_employee_email.sql
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS email TEXT;
