AI Development Guidelines

This document provides rules and expectations for AI-assisted development in this repository.

It ensures that automated tools and AI coding agents extend the system without violating architectural decisions or destabilizing the application.

All AI-generated changes must follow these guidelines.

Project Overview

This project is a contractor operations platform designed to manage:

crew members

daily tasks and checklists

manager-to-crew communication

time tracking

operational reporting

project records

payroll tracking

future job cost analysis

The system prioritizes operational reliability, modular design, and maintainability.

Core Architecture

The application uses the following stack:

Next.js (App Router)
Supabase Auth
Supabase Postgres
Row Level Security (RLS)
Vercel hosting

All database access must respect Supabase RLS.

Authorization decisions must occur server-side.

Critical Rules

AI tools must not violate these rules.

Do NOT rename these existing tables

The following tables must remain unchanged:

profiles
employees
time_entries

Even though the UI uses "Crew", the database table employees must not be renamed.

Do NOT bypass Row Level Security

All data access must respect Supabase RLS policies.

Never disable RLS or create queries that bypass security.

Do NOT implement permission logic using raw roles

Authorization must use capabilities, not role comparisons.

Example:

Correct:

requireCapability("manage_tasks")

Incorrect:

if (user.role === "admin")

Roles only define capability bundles.

Capabilities control authorization.

Do NOT combine operational reporting with payroll logic

Reports and payroll are separate modules.

Reports are operational tools for reviewing hours.

Payroll manages compensation and payments.

These must remain separate.

Do NOT introduce large multi-purpose tables

Each domain must remain modular.

Examples of domains:

tasks

notes

payroll

projects

permissions

Avoid creating tables that mix multiple concerns.

Approved Database Structure

The following domains exist.

Identity and Permissions

Tables:

profiles
employees
roles
capabilities
role_capabilities
employee_roles

Purpose:

Manage identities, roles, and capability-based access control.

Time Tracking

Table:

time_entries

Tracks clock-in and clock-out events.

Additional edit fields may exist:

edited_at
edited_by
edit_reason
manual_entry
Tasks

Tables:

task_templates
task_template_sections
task_template_items
task_assignments
task_assignment_targets
task_item_logs

Purpose:

Manage structured daily task execution.

Notes and Communication

Tables:

employee_notes
manager_notes
manager_note_reads
project_notes

Purpose:

Allow communication and personal note keeping.

Projects

Tables:

clients
projects

Purpose:

Track project context and client records.

Payroll

Tables:

payment_methods
employee_payments
comp_adjustment_types
employee_comp_adjustments
holding_account_ledger

Purpose:

Track compensation and payroll adjustments.

Payroll UI may evolve later.

File Structure

AI-generated code must follow this structure.

app/
  dashboard/
    crew/
    tasks/
    tasks/admin/
    reports/

components/
  dashboard/
  notes/
  tasks/

lib/
  auth/
  notes/
  tasks/
  payroll/
  projects/

supabase/
  migrations/

docs/
Migration Rules

Database changes must be introduced using ordered migration files.

Migration naming format:

001_description.sql
002_description.sql
003_description.sql

Example:

001_permissions_foundation.sql
002_projects_backbone.sql
003_notes_foundation.sql
004_tasks_foundation.sql
005_payroll_foundation.sql
006_time_entry_edits.sql

AI tools must not modify previous migrations after they are applied.

New schema changes must use new migrations.

Capability-Based Authorization

All protected routes or server actions must check capabilities.

Example helper functions exist in:

lib/auth/

Examples:

getUserCapabilities()
hasCapability()
requireCapability()

Authorization checks should occur on the server.

Scheduling Terminology

Scheduling actions must use clear directional language.

Approved terms:

Push Back 1 Day
Push Back X Days
Pull Forward 1 Day
Pull Forward X Days

Avoid ambiguous words such as:

move
advance
forward

UI Terminology

User-facing language must use:

Crew
Crew Member
Crew Lead
Manager

The term Employee should not appear in the UI.

Task Engine Rules

The task system supports three display modes:

full
section
single

Meaning:

full → entire checklist visible
section → one section at a time
single → one item at a time

Completion must create a timestamped entry in task_item_logs.

Reports Module Rules

Reports are operational tools only.

Reports can:

show hours by pay period

show recent time entries

identify missing clock-outs

show weekly crew totals

Reports can allow administrators to:

edit clock-in times

edit clock-out times

add correction notes

create manual time entries

Reports must not handle:

payroll payouts

compensation calculations

financial balances

Payroll Module Rules

Payroll handles:

payment tracking

compensation adjustments

holding balances

Payroll UI is restricted to authorized users.

AI Implementation Behavior

When implementing new features, AI tools must:

Check existing architecture documentation

Extend the correct domain module

Respect capability-based authorization

Preserve existing working systems

Use migrations for database changes

Avoid architectural shortcuts

Documentation Maintenance

When AI tools introduce major features:

Update:

docs/architecture.md
docs/roadmap.md
docs/build-log.md

This keeps documentation aligned with the actual system.

AI Safety Principle

The highest priority is maintaining system stability.

If a proposed change conflicts with the architecture:

The AI tool must ask for clarification instead of implementing the change automatically.
