AI Development Guidelines

AI agents must read docs/AI_CONTEXT.md and docs/DEVELOPER_MAP.md before proposing code changes.

This document defines rules, architecture, and expectations for AI-assisted development in this repository.

It ensures that automated tools and AI coding agents extend the system without violating architectural decisions or destabilizing the application.

All AI-generated changes must follow these guidelines.

Project Overview

This project is an internal contractor operations platform designed to manage:

crew members

daily tasks and checklists

manager-to-crew communication

time tracking

operational reporting

project records

payroll tracking

future job cost analysis

The system prioritizes:

operational reliability

modular architecture

maintainability

capability-based authorization

This application is intended to run daily business operations for contractor crews.

Technology Stack

The application uses the following stack:

Next.js (App Router)

Supabase Auth

Supabase Postgres

Supabase Row Level Security (RLS)

Vercel hosting

All database access must respect Supabase RLS.

Authorization decisions must occur server-side.

Current Development Status

The system is partially implemented.

Working Systems

These systems currently function:

authentication

crew member accounts

employee records

clock-in / clock-out

time entry logging

operational reporting

weekly task scheduler UI

ad-hoc custom tasks

task drawer UI

capability-based authorization helpers

Supabase RLS policies for task system

Partially Implemented

These systems exist but are incomplete:

Today Board

Crew workspace task display

Manager inbox

Task editing

Personal notes visibility

Project overview cards

Not Yet Implemented

These systems are planned but not built:

task deletion UI

task reordering

checklist template management

multi-step checklist progression

payroll UI

job costing tools

estimating tools

AI tools should not attempt to fully implement these systems unless specifically requested.

Core Architecture

The system is organized into modular domains.

Domains must remain separated.

Primary domains:

identity / permissions

tasks

notes / communication

time tracking

projects

payroll

reports

Each domain should remain logically independent.

Critical Rules

AI tools must not violate these rules.

Do NOT rename these existing tables

The following tables must remain unchanged:

profiles
employees
time_entries

Even though the UI uses Crew, the database table employees must not be renamed.

Do NOT bypass Row Level Security

All data access must respect Supabase RLS policies.

Never disable RLS.

Never query data using a service role in client-accessible code.

Do NOT implement permission logic using raw roles

Authorization must use capabilities, not role comparisons.

Correct:

requireCapability("manage_tasks")

Incorrect:

if (user.role === "admin")

Roles only define capability bundles.

Capabilities control authorization.

Do NOT combine operational reporting with payroll logic

Reports and payroll are separate modules.

Reports are operational tools.

Payroll manages compensation.

These systems must remain separate.

Do NOT introduce large multi-purpose tables

Each domain must remain modular.

Examples of domains:

tasks

notes

payroll

projects

permissions

Avoid tables mixing unrelated concerns.

Approved Database Structure
Identity and Permissions

Tables:

profiles
employees
roles
capabilities
role_capabilities
employee_roles

Purpose:

Manage identities and capability-based access control.

Important:

Capabilities determine authorization.

Roles only group capabilities.

Time Tracking

Table:

time_entries

Purpose:

Records clock-in and clock-out events.

Additional edit fields:

edited_at
edited_by
edit_reason
manual_entry

Clock-in/out behavior is stable and must not be rewritten.

Task System Architecture

The task engine uses three layers.

1. Templates

Reusable task definitions.

Tables:

task_templates
task_template_sections
task_template_items
2. Assignments

Scheduled tasks.

Table:

task_assignments

Assignments define:

date

template reference

display mode

title override

3. Instances

Actual daily task execution records.

Tables:

task_assignment_instances
task_assignment_instance_targets
task_item_logs

Important rule:

Ad-hoc tasks create:

task_assignments (parent)
task_assignment_instances (child)
task_assignment_instance_targets

AI tools must preserve this relationship.

Task Display Modes

Supported display modes:

full
section
single

Meaning:

full → entire checklist visible
section → one section visible
single → one item visible

Completion must create a timestamped entry in:

task_item_logs
Notes and Communication

Tables:

employee_notes
manager_notes
manager_note_reads
project_notes

Purpose:

personal notes

manager instructions

project communication

Projects

Tables:

clients
projects

Purpose:

Store project and client context.

Payroll

Tables:

payment_methods
employee_payments
comp_adjustment_types
employee_comp_adjustments
holding_account_ledger

Purpose:

Track compensation and payroll adjustments.

Payroll UI is restricted to authorized users.

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

Database changes must use ordered migration files.

Format:

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

Rules:

never modify applied migrations

create new migrations instead

Capability-Based Authorization

Authorization helpers exist in:

lib/auth/

Examples:

getUserCapabilities()
hasCapability()
requireCapability()

All protected routes and server actions must use these helpers.

## Scheduler Architecture Rule

The Weekly Scheduler is responsible for **task placement**, not deep task authoring.

Two separate concepts exist in the task system:

### Task Definition
Defines what the work is.

Includes:

- title
- checklist sections
- checklist items
- instructions
- default display mode

Stored in:

task_templates  
task_template_sections  
task_template_items  

Task definitions are reusable and should be edited in a **Template Management UI**, not the scheduler.

---

### Task Placement
Defines when and for whom work occurs.

Includes:

- assignment date
- crew or role targets
- ordering within a day
- status
- instance tracking

Stored in:

task_assignments  
task_assignment_instances  
task_assignment_instance_targets  

The scheduler operates on **placements**, not definitions.

---

### Scheduler Responsibilities

The Weekly Scheduler should support:

- placing tasks on specific days
- assigning crew members or roles
- reordering tasks within a day
- deleting scheduled tasks
- viewing task details

The scheduler **should not become the primary interface for editing reusable checklist content**.

---

### Template Editing

Reusable checklist content must be edited through a **separate template management interface**.

That interface will eventually allow:

- section creation
- item creation
- checklist ordering
- default display mode selection

This keeps reusable templates stable and prevents accidental edits affecting multiple scheduled tasks.

---

### AI Implementation Rule

AI agents must not merge **template authoring** and **task scheduling** into the same modal or interface unless explicitly instructed.

Scheduler interfaces should remain focused on **placement and execution**, not content authoring.

Scheduling Terminology

Scheduling actions must use clear directional language.

Approved terms:

Push Back 1 Day
Push Back X Days
Pull Forward 1 Day
Pull Forward X Days

Avoid ambiguous terms:

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

Current Development Priorities

AI tools should focus on the following tasks before building new systems.

Priority order:

Task deletion

Crew workspace navigation to clock-in / clock-out

Task reordering

Today Board integration

Manager note authorization fix

Checklist progression improvements

AI tools should not begin major template system work yet.

Known Issues

Known issues currently exist:

task editing modal not implemented

Today Board not displaying scheduled tasks

crew workspace lacks clear navigation to time manager

personal notes save but may not display

manager notes require admin employee profile linking

AI tools should treat these as known defects rather than redesigning the system.

AI Implementation Behavior

When implementing new features AI tools must:

read this document first

check architecture documentation

extend existing modules

respect capability-based authorization

preserve working systems

use migrations for database changes

avoid architectural shortcuts

Documentation Maintenance

When major features are introduced update:

docs/architecture.md
docs/roadmap.md
docs/build-log.md

Documentation must reflect the real system.

AI Safety Principle

System stability takes priority over new features.

If a proposed change conflicts with architecture:

The AI must ask for clarification instead of implementing automatically.
