export type ResourceItem = {
    id: string
    category: 'video' | 'sop' | 'safety' | 'how-to' | 'training' | 'procedure'
    title: string
    description: string
    href: string
}

/** Placeholder links — edit href values when real URLs are ready. */
export const OPS_RESOURCES: ResourceItem[] = [
    {
        id: 'clock-in-out',
        category: 'how-to',
        title: 'How to clock in and out',
        description: 'Step-by-step for crew time tracking on mobile.',
        href: 'https://www.youtube.com/watch?v=PLACEHOLDER_CLOCK_IN'
    },
    {
        id: 'daily-checklist',
        category: 'video',
        title: 'Daily checklist walkthrough',
        description: 'Video overview of completing assigned tasks and checklists.',
        href: 'https://www.youtube.com/watch?v=PLACEHOLDER_CHECKLIST'
    },
    {
        id: 'ladder-safety',
        category: 'safety',
        title: 'Ladder and fall protection reminders',
        description: 'Quick safety review before elevated work.',
        href: '#safety-ladder-placeholder'
    },
    {
        id: 'time-corrections',
        category: 'sop',
        title: 'Time entry corrections (admin)',
        description: 'When and how to edit or add manual time in Reports.',
        href: '#sop-time-corrections'
    },
    {
        id: 'payroll-periods',
        category: 'procedure',
        title: 'Payroll periods and payments',
        description: 'Friday–Thursday pay periods, advances, and reimbursements.',
        href: '#procedure-payroll'
    },
    {
        id: 'client-communication',
        category: 'training',
        title: 'Client communication standards',
        description: 'Clear updates, scope notes, and follow-up expectations.',
        href: '#training-communication'
    },
    {
        id: 'ppe',
        category: 'safety',
        title: 'PPE requirements on site',
        description: 'Minimum personal protective equipment by job type.',
        href: '#safety-ppe'
    },
    {
        id: 'scheduler-admin',
        category: 'how-to',
        title: 'Using the week scheduler',
        description: 'Assigning tasks and reviewing crew workload.',
        href: '#howto-scheduler'
    }
]

export const RESOURCE_CATEGORY_LABELS: Record<ResourceItem['category'], string> = {
    video: 'Video',
    sop: 'SOP',
    safety: 'Safety',
    'how-to': 'How-to',
    training: 'Training',
    procedure: 'Procedure'
}
