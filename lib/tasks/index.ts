'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Strict terminology for scheduling tasks
 */
export type ScheduleDirection =
    | 'Push Back 1 Day'
    | 'Push Back X Days'
    | 'Pull Forward 1 Day'
    | 'Pull Forward X Days';

export type TaskDisplayMode = 'full' | 'section' | 'single';

/**
 * Gets tasks assigned to an employee for today
 */
export async function getTodaysTasks(employeeId: string) {
    const supabase = await createClient()

    // In a real implementation this matches the exact local date with timezone logic
    const todayStr = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
        .from('task_assignment_targets')
        .select(`
            assignment_id,
            task_assignments (
                id,
                name,
                scheduled_for,
                display_mode
            )
        `)
        .eq('employee_id', employeeId)

    if (error) console.error("Error fetching today's tasks:", error)

    // Server-side filtering for shell purposes until real scheduling lands
    const todaysAssignments = data?.filter((row: any) => {
        const assignment = Array.isArray(row.task_assignments) ? row.task_assignments[0] : row.task_assignments;
        return assignment?.scheduled_for === todayStr || true; // Showing all for shell visualization right now
    })

    return todaysAssignments || []
}

/**
 * Progress logging mechanism (creates timestamped immutable log)
 */
export async function logTaskItem(assignmentId: string, templateItemId: string, employeeId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('task_item_logs')
        .insert([{
            assignment_id: assignmentId,
            template_item_id: templateItemId,
            employee_id: employeeId,
            status: 'completed',
            logged_at: new Date().toISOString()
        }])

    if (error) console.error("Error logging task item:", error)
    revalidatePath('/dashboard/crew')
    return { error }
}

/**
 * Example scheduling action utilizing strict terminology
 */
export async function rescheduleTask(assignmentId: string, direction: ScheduleDirection, days: number = 1) {
    console.log(`Rescheduling task ${assignmentId} using: [${direction}] for ${days} days`)
    // Database logic to modify task_assignments.scheduled_for would go here
}
