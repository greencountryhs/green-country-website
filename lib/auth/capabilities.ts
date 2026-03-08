// Exporting capability names as constants to avoid magic strings throughout the app
export const CAPABILITIES = {
    MANAGE_CREW: 'manage_crew',
    MANAGE_TASKS: 'manage_tasks',
    ASSIGN_TASKS: 'assign_tasks',
    VIEW_PROJECT_NOTES: 'view_project_notes',
    POST_MANAGER_NOTES: 'post_manager_notes',
    VIEW_PAYROLL_SUMMARY: 'view_payroll_summary',
    RECORD_PAYMENTS: 'record_payments',
    MANAGE_COMP_ADJUSTMENTS: 'manage_comp_adjustments',
    VIEW_JOB_COSTS: 'view_job_costs',
    MANAGE_ESTIMATES: 'manage_estimates',
    VIEW_ALL_PROJECTS: 'view_all_projects',
    VIEW_OWN_HOURS: 'view_own_hours',
} as const;

export type CapabilityName = typeof CAPABILITIES[keyof typeof CAPABILITIES];
