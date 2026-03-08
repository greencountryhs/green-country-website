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

    // Using exact local date format YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0]

    // Query targets -> assignments -> instances
    const { data, error } = await supabase
        .from('task_assignment_targets')
        .select(`
            assignment_id,
            task_assignments (
                id,
                name,
                display_mode,
                task_assignment_instances!inner (
                    id,
                    scheduled_date,
                    status
                )
            )
        `)
        .eq('employee_id', employeeId)
        // !inner join ensures we only get rows that actually have an instance for today
        .eq('task_assignments.task_assignment_instances.scheduled_date', todayStr)

    if (error) console.error("Error fetching today's tasks:", error)

    const todaysInstances: any[] = []
    data?.forEach((target: any) => {
        const assignment = Array.isArray(target.task_assignments) ? target.task_assignments[0] : target.task_assignments
        if (assignment) {
            const instances = Array.isArray(assignment.task_assignment_instances) ? assignment.task_assignment_instances : [assignment.task_assignment_instances]
            const todayInstance = instances[0]
            if (todayInstance) {
                todaysInstances.push({
                    instance_id: todayInstance.id,
                    assignment_id: assignment.id,
                    assignment_name: assignment.name,
                    display_mode: assignment.display_mode,
                    status: todayInstance.status
                })
            }
        }
    })

    return todaysInstances
}

/**
 * Progress logging mechanism (creates timestamped immutable log attached to the instance)
 */
export async function logTaskItem(instanceId: string, templateItemId: string, employeeId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('task_item_logs')
        .insert([{
            instance_id: instanceId,
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
export async function rescheduleTaskInstance(instanceId: string, direction: ScheduleDirection, days: number = 1) {
    console.log(`Rescheduling task instance ${instanceId} using: [${direction}] for ${days} days`)
    // Database logic to modify task_assignment_instances.scheduled_date would go here
    // e.g.
    // 'Push Back 1 Day' -> date = date + 1
    // 'Pull Forward 1 Day' -> date = date - 1
}
