# Contractor Management System State

Architecture milestone reached.

Core system implemented:

Auth & Permissions
- Supabase auth
- capability-based permissions
- roles, capabilities, employee_roles

Crew Operations
- employees table retained
- time_entries with audit fields
- crew terminology used in UI

Task System
- task_templates
- task_assignments
- task_assignment_targets
- task_item_logs
- crew checklist UI

Communication
- employee_notes
- manager_notes
- manager_note_reads
- project_notes

Reports V1
- /dashboard/reports
- weekly hours
- missing clock-outs
- recent entries
- inline correction actions

Reporting View
- public.time_entry_report_view

Projects
- clients
- projects tables exist (UI not built yet)

Payroll foundation
- payment_methods
- employee_payments
- employee_comp_adjustments
- holding_account_ledger

Next Development Target
Task scheduling system.

Goal:
Allow managers to plan work ahead using templates, assignments, and calendar views.
