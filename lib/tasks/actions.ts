'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { ScheduleDirection } from './index'

export async function logTaskItem(instanceId: string, templateItemId: string | null, employeeId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('task_item_logs')
        .insert([{
            task_assignment_instance_id: instanceId,
            task_template_item_id: templateItemId,
            employee_id: employeeId,
            status: 'completed',
            logged_at: new Date().toISOString()
        }])

    if (error) console.error("Error logging task item:", error)
    revalidatePath('/dashboard/crew')
    return { error }
}

export async function rescheduleTaskInstance(instanceId: string, direction: ScheduleDirection, days: number = 1) {
    const supabase = await createClient()

    const { data: instance, error: fetchErr } = await supabase
        .from('task_assignment_instances')
        .select('assignment_date')
        .eq('id', instanceId)
        .single()

    if (fetchErr || !instance) throw new Error("Could not find instance")

    const currentDate = new Date(instance.assignment_date)
    let newDate = new Date(currentDate)

    if (direction.startsWith('Push Back')) {
        newDate.setDate(currentDate.getDate() + days)
    } else if (direction.startsWith('Pull Forward')) {
        newDate.setDate(currentDate.getDate() - days)
    }

    const { error: updateErr } = await supabase
        .from('task_assignment_instances')
        .update({ assignment_date: newDate.toISOString().split('T')[0] })
        .eq('id', instanceId)

    if (updateErr) throw new Error("Failed to reschedule instance")

    revalidatePath('/dashboard/tasks/scheduler')
    revalidatePath('/dashboard/tasks')
}

export async function reassignTaskInstance(instanceId: string, targetType: string, targetId?: string) {
    const supabase = await createClient()

    // Wipe existing targets for this instance
    const { error: wipeErr } = await supabase
        .from('task_assignment_instance_targets')
        .delete()
        .eq('task_assignment_instance_id', instanceId)

    if (wipeErr) throw new Error("Failed to clear old targets")

    // Insert new target with error checking
    if (targetType === 'employee' && targetId) {
        const { error } = await supabase
            .from('task_assignment_instance_targets')
            .insert([{ task_assignment_instance_id: instanceId, target_type: 'employee', employee_id: targetId }])
        if (error) throw new Error("Failed to assign employee target: " + error.message)
    } else if (targetType === 'role' && targetId) {
        const { error } = await supabase
            .from('task_assignment_instance_targets')
            .insert([{ task_assignment_instance_id: instanceId, target_type: 'role', role_id: targetId }])
        if (error) throw new Error("Failed to assign role target: " + error.message)
    } else if (targetType === 'all_crew') {
        const { error } = await supabase
            .from('task_assignment_instance_targets')
            .insert([{ task_assignment_instance_id: instanceId, target_type: 'all_crew' }])
        if (error) throw new Error("Failed to assign all_crew target: " + error.message)
    }

    revalidatePath('/dashboard/tasks/scheduler')
    revalidatePath('/dashboard/tasks')
}

export async function createCustomTaskInstance(
    dateStr: string,
    title: string,
    displayMode: 'full' | 'single' | 'section' = 'full',
    targetType: 'employee' | 'role' | 'all_crew' = 'all_crew',
    targetId?: string
) {
    if (!title || !title.trim()) throw new Error("Task title is required.")
    if (!dateStr) throw new Error("Assignment date is required.")
    if (targetType === 'employee' && !targetId) throw new Error("Employee target requires an employee ID.")
    if (targetType === 'role' && !targetId) throw new Error("Role target requires a role ID.")

    const supabase = await createClient()

    // 1. Create the parent ad hoc task assignment (legacy tracking baseline)
    const { data: assignment, error: assignErr } = await supabase
        .from('task_assignments')
        .insert([{
            task_template_id: null,
            assignment_date: dateStr,
            title: title.trim(),
            display_mode: displayMode
        }])
        .select('id')
        .single()

    if (assignErr || !assignment) throw new Error("Failed to create ad hoc parent assignment: " + assignErr?.message)

    // 2. Create the child instance
    const { data: instance, error: instanceErr } = await supabase
        .from('task_assignment_instances')
        .insert([{
            task_assignment_id: assignment.id,
            assignment_date: dateStr,
            title: title.trim(),
            display_mode: displayMode,
            is_override: true,
            status: 'scheduled'
        }])
        .select('id')
        .single()

    if (instanceErr || !instance) throw new Error("Failed to schedule custom task instance: " + instanceErr?.message)

    // 3. Create the targets with error checking
    if (targetType === 'employee' && targetId) {
        const { error } = await supabase
            .from('task_assignment_instance_targets')
            .insert([{ task_assignment_instance_id: instance.id, target_type: 'employee', employee_id: targetId }])
        if (error) throw new Error("Failed to assign employee target: " + error.message)
    } else if (targetType === 'role' && targetId) {
        const { error } = await supabase
            .from('task_assignment_instance_targets')
            .insert([{ task_assignment_instance_id: instance.id, target_type: 'role', role_id: targetId }])
        if (error) throw new Error("Failed to assign role target: " + error.message)
    } else if (targetType === 'all_crew') {
        const { error } = await supabase
            .from('task_assignment_instance_targets')
            .insert([{ task_assignment_instance_id: instance.id, target_type: 'all_crew' }])
        if (error) throw new Error("Failed to assign all_crew target: " + error.message)
    }

    revalidatePath('/dashboard/tasks/scheduler')
    revalidatePath('/dashboard/tasks')
    revalidatePath('/dashboard/tasks/admin')

    return { success: true, instanceId: instance.id }
}

export async function createSchedulerInstance(
    dateStr: string,
    title: string,
    templateId?: string,
    displayMode: 'full' | 'single' | 'section' = 'full',
    targetType: 'employee' | 'role' | 'all_crew' = 'all_crew',
    targetId?: string
) {
    const supabase = await createClient()

    let legacyAssignmentId = null

    if (templateId) {
        const { data: legacy, error: legacyErr } = await supabase
            .from('task_assignments')
            .insert([{
                task_template_id: templateId,
                assignment_date: dateStr,
                title: title,
                display_mode: displayMode
            }])
            .select('id')
            .single()

        if (legacyErr) throw new Error("Failed to create template tracking baseline: " + legacyErr.message)
        legacyAssignmentId = legacy.id
    }

    const { data: instance, error: instanceErr } = await supabase
        .from('task_assignment_instances')
        .insert([{
            task_assignment_id: legacyAssignmentId,
            assignment_date: dateStr,
            title: title,
            display_mode: displayMode,
            is_override: !templateId,
            status: 'scheduled'
        }])
        .select('id')
        .single()

    if (instanceErr || !instance) throw new Error("Failed to schedule instance: " + instanceErr?.message)

    // Insert target with error checking
    if (targetType === 'employee' && targetId) {
        const { error } = await supabase
            .from('task_assignment_instance_targets')
            .insert([{ task_assignment_instance_id: instance.id, target_type: 'employee', employee_id: targetId }])
        if (error) throw new Error("Failed to assign employee target: " + error.message)
    } else if (targetType === 'role' && targetId) {
        const { error } = await supabase
            .from('task_assignment_instance_targets')
            .insert([{ task_assignment_instance_id: instance.id, target_type: 'role', role_id: targetId }])
        if (error) throw new Error("Failed to assign role target: " + error.message)
    } else if (targetType === 'all_crew') {
        const { error } = await supabase
            .from('task_assignment_instance_targets')
            .insert([{ task_assignment_instance_id: instance.id, target_type: 'all_crew' }])
        if (error) throw new Error("Failed to assign all_crew target: " + error.message)
    }

    revalidatePath('/dashboard/tasks/scheduler')
    revalidatePath('/dashboard/tasks')
    revalidatePath('/dashboard/tasks/admin')

    return { success: true, instanceId: instance.id }
}
