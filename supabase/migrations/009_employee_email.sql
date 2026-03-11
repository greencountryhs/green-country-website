-- ==========================================
-- 009_employee_email.sql
-- Formally add email column to employees table
-- ==========================================

ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS email TEXT;
