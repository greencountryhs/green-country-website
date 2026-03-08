# Contractor Management System – Architecture Plan

This document describes the technical architecture and database design for the contractor management application.

The system is built with:

Next.js (App Router)  
Supabase (Auth + Postgres + RLS)  
Vercel hosting  

---

# Core Architectural Principles

1. Separate operational domains
2. Use capability-based permissions
3. Prefer small migrations over large schema changes
4. Use server-side access control
5. Keep database structure modular
6. Preserve existing working systems during upgrades

---

# Identity & Permissions

Tables:

profiles  
employees  
roles  
employee_roles  
capabilities  
role_capabilities  

Purpose:

profiles → user identity tied to Supabase auth  
employees → crew member record  
roles → role bundles  
capabilities → granular permissions  
role_capabilities → capability mapping  

Example capabilities:

manage_crew  
manage_tasks  
assign_tasks  
view_project_notes  
post_manager_notes  
view_payroll_summary  
record_payments  
manage_comp_adjustments  
view_job_costs  
manage_estimates  
view_all_projects  
view_own_hours  

Access control should check **capabilities**, not raw roles.

---

# Time Tracking

Table:

time_entries

Fields:

employee_id  
clock_in  
clock_out  
source  
notes  

This table records labor activity only.  
Payroll data must not be stored here.

---

# Task System

Tables:

task_templates  
task_template_sections  
task_template_items  
task_assignments  
task_assignment_targets  
task_item_logs  

Purpose:

Templates define reusable work plans.

Assignments schedule tasks for specific days.

Targets define which crew members receive the task.

Logs record timestamped progress.

Display modes:

full  
section  
single

---

# Communication & Notes

Tables:

employee_notes  
manager_notes  
manager_note_reads  
project_notes  

Purpose:

employee_notes  
crew personal notes (measurements, reminders)

manager_notes  
instructions or announcements from managers

manager_note_reads  
tracks recipients and read status

project_notes  
notes tied to project context

---

# Payroll System

Tables:

payment_methods  
employee_payments  
comp_adjustment_types  
employee_comp_adjustments  
holding_account_ledger  

Purpose:

payment_methods  
defines cash, transfer, etc.

employee_payments  
records payroll payments

comp_adjustment_types  
categories like bonus, per diem

employee_comp_adjustments  
applies adjustments to payroll periods

holding_account_ledger  
tracks balances when money is held

---

# Projects

Tables:

clients  
projects  

Purpose:

clients store customer records  
projects represent jobs

Project finance and cost tracking will expand later.

---

# Future Financial Tables

Planned later:

project_cost_entries  
project_receipts  
client_payments  

These support:

material tracking  
subcontractor costs  
permit costs  
revenue tracking  

---

# Row Level Security Guidelines

General principles:

Crew members should only see their own data.

Managers can see relevant operational data.

Admins can see full financial data.

Examples:

employee_notes → owner only  
manager_note_reads → recipient only  
employee_payments → admin only  
holding_account_ledger → admin only  

Every new table must include RLS policies.

---

# File Structure Direction

Recommended structure:

lib/auth  
lib/tasks  
lib/notes  
lib/payroll  
lib/projects  

Routes:

app/dashboard/crew  
app/dashboard/tasks  
app/dashboard/inbox  
app/dashboard/payroll  
app/dashboard/projects  

---

# Migration Strategy

Avoid one large schema file.

Create staged migrations:

001_permissions_foundation.sql  
002_projects_backbone.sql  
003_notes_foundation.sql  
004_tasks_foundation.sql  
005_payroll_foundation.sql  

Each migration should include RLS policies.
