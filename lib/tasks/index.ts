// Tasks Module

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

export async function getTaskTemplates() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('task_templates')
        .select('id, title')
        .order('title')
    if (error) console.error("Error fetching templates:", error)
    return data || []
}

export type WeekAssignmentInstance = {
    id: string
    taskAssignmentId: string
    assignmentDate: string
    title: string
    displayMode: "full" | "section" | "single" | null
    status: "scheduled" | "active" | "completed" | "cancelled"
    isOverride: boolean
    sequenceId: string | null
    sequenceOrder: number | null
    sequenceKey: string | null
    createdAt: string
    targets: Array<{
        id: string
        targetType: "employee" | "all_crew" | "role"
        employeeId: string | null
        roleId: string | null
        createdAt: string
    }>
    logs: Array<{
        id: string
        status: string | null
        employeeId: string | null
        loggedAt: string | null
        taskTemplateItemId: string | null
        taskAssignmentInstanceId: string | null
    }>
    logCount: number
    completedLogCount: number
}

type TaskAssignmentInstanceRow = {
    id: string
    task_assignment_id: string
    assignment_date: string
    title: string
    display_mode: "full" | "section" | "single" | null
    status: "scheduled" | "active" | "completed" | "cancelled"
    is_override: boolean
    sequence_id: string | null
    sequence_order: number | null
    sequence_key: string | null
    created_at: string
    task_assignment_instance_targets:
    | Array<{
        id: string
        target_type: "employee" | "all_crew" | "role"
        employee_id: string | null
        role_id: string | null
        created_at: string
    }>
    | null
    task_item_logs:
    | Array<{
        id: string
        status: string | null
        employee_id: string | null
        logged_at: string | null
        task_template_item_id: string | null
        task_assignment_instance_id: string | null
    }>
    | null
}

export async function getWeekAssignmentInstances(
    startDate: string,
    endDate: string
): Promise<WeekAssignmentInstance[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("task_assignment_instances")
        .select(`
            id,
            task_assignment_id,
            assignment_date,
            title,
            display_mode,
            status,
            is_override,
            sequence_id,
            sequence_order,
            sequence_key,
            created_at,
            task_assignment_instance_targets (
                id,
                target_type,
                employee_id,
                role_id,
                created_at
            ),
            task_item_logs (
                id,
                status,
                employee_id,
                logged_at,
                task_template_item_id,
                task_assignment_instance_id
            )
        `)
        .gte("assignment_date", startDate)
        .lte("assignment_date", endDate)
        .order("assignment_date", { ascending: true })
        .order("sequence_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })

    if (error) {
        throw new Error(`Failed to load week assignment instances: ${error.message}`)
    }

    const rows = (data ?? []) as TaskAssignmentInstanceRow[]

    return rows.map((row) => {
        const logs = row.task_item_logs ?? []
        const targets = row.task_assignment_instance_targets ?? []

        return {
            id: row.id,
            taskAssignmentId: row.task_assignment_id,
            assignmentDate: row.assignment_date,
            title: row.title,
            displayMode: row.display_mode,
            status: row.status,
            isOverride: row.is_override,
            sequenceId: row.sequence_id,
            sequenceOrder: row.sequence_order,
            sequenceKey: row.sequence_key,
            createdAt: row.created_at,
            targets: targets.map((target) => ({
                id: target.id,
                targetType: target.target_type,
                employeeId: target.employee_id,
                roleId: target.role_id,
                createdAt: target.created_at,
            })),
            logs: logs.map((log) => ({
                id: log.id,
                status: log.status,
                employeeId: log.employee_id,
                loggedAt: log.logged_at,
                taskTemplateItemId: log.task_template_item_id,
                taskAssignmentInstanceId: log.task_assignment_instance_id,
            })),
            logCount: logs.length,
            completedLogCount: logs.filter((log) => log.status === "completed").length,
        }
    })
}

export function groupWeekAssignmentInstancesByDate(
    rows: WeekAssignmentInstance[]
): Record<string, WeekAssignmentInstance[]> {
    return rows.reduce<Record<string, WeekAssignmentInstance[]>>((acc, row) => {
        if (!acc[row.assignmentDate]) {
            acc[row.assignmentDate] = []
        }
        acc[row.assignmentDate].push(row)
        return acc
    }, {})
}

export async function getTodaysTasks(employeeId: string) {
    const supabase = await createClient()
    const todayStr = new Date().toISOString().split('T')[0]

    const { data: roles } = await supabase.from('employee_roles').select('role_id').eq('employee_id', employeeId)
    const roleIds = roles?.map(r => r.role_id) || []

    const { data, error } = await supabase
        .from('task_assignment_instances')
        .select(`
            id,
            task_assignment_id,
            assignment_date,
            title,
            status,
            display_mode,
            task_assignment_instance_targets (
                target_type,
                employee_id,
                role_id
            )
        `)
        .eq('assignment_date', todayStr)

    if (error) console.error("Error fetching today's tasks:", error)

    // JS filter to ensure only relevant tasks show up
    const filtered = (data || []).filter((inst: any) => {
        const targets = inst.task_assignment_instance_targets || []
        return targets.some((t: any) => 
            t.target_type === 'all_crew' || 
            (t.target_type === 'employee' && t.employee_id === employeeId) ||
            (t.target_type === 'role' && roleIds.includes(t.role_id))
        )
    })

    return filtered.map((inst: any) => ({
        task_assignment_instance_id: inst.id,
        assignment_id: inst.task_assignment_id,
        assignment_name: inst.title,
        display_mode: inst.display_mode || 'full',
        status: inst.status
    }))
}

export async function getTaskInstanceItems(instanceId: string) {
    const supabase = await createClient()

    const { data: instance } = await supabase
        .from('task_assignment_instances')
        .select(`
            id,
            title,
            task_assignment_id,
            task_assignments (
                task_template_id
            ),
            task_item_logs (
                task_template_item_id,
                status
            )
        `)
        .eq('id', instanceId)
        .single()

    if (!instance) return []

    const logs = instance.task_item_logs || []
    const templateId = Array.isArray(instance.task_assignments) 
        ? instance.task_assignments[0]?.task_template_id 
        : (instance.task_assignments as any)?.task_template_id

    if (templateId) {
        const { data: sections } = await supabase
            .from('task_template_sections')
            .select(`
                id,
                title,
                task_template_items (
                    id,
                    content,
                    sort_order
                )
            `)
            .eq('task_template_id', templateId)
            .order('sort_order')

        let items: any[] = []
        if (sections) {
            for (const sec of sections) {
                const sectionItems = sec.task_template_items || []
                sectionItems.sort((a: any, b: any) => a.sort_order - b.sort_order)
                for (const item of sectionItems) {
                    const isCompleted = logs.some((l: any) => l.task_template_item_id === item.id && l.status === 'completed')
                    items.push({
                        id: item.id,
                        content: item.content,
                        section: sec.title,
                        completed: isCompleted
                    })
                }
            }
        }
        return items
    } else {
        const isCompleted = logs.some((l: any) => l.task_template_item_id === null && l.status === 'completed')
        return [{
            id: 'custom',
            content: instance.title,
            section: null,
            completed: isCompleted
        }]
    }
}
