'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { ScheduleDirection } from './index'
import { CAPABILITIES } from '@/lib/auth/capabilities'
import { requireCapability } from '@/lib/auth/requireCapability'

async function assertCanManageTasks() {
    const isAuthorized = await requireCapability(CAPABILITIES.MANAGE_TASKS)
    if (!isAuthorized) {
        throw new Error('Unauthorized: manage_tasks capability required')
    }
}

async function getCurrentEmployeeId() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error('Unauthorized: user not authenticated')
    }

    const { data: employee, error } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (error || !employee) {
        throw new Error('Unauthorized: employee profile not found')
    }

    return { supabase, employeeId: employee.id }
}

export async function logTaskItem(instanceId: string, templateItemId: string | null) {
    const { supabase, employeeId: actorEmployeeId } = await getCurrentEmployeeId()
    const { error } = await supabase
        .from('task_item_logs')
        .insert([{
            task_assignment_instance_id: instanceId,
            task_template_item_id: templateItemId,
            // Do not trust client-supplied employee IDs for write attribution.
            employee_id: actorEmployeeId,
            status: 'completed',
            logged_at: new Date().toISOString()
        }])

    if (error) console.error("Error logging task item:", error)
    revalidatePath('/dashboard/crew')
    return { error }
}

export async function rescheduleTaskInstance(instanceId: string, direction: ScheduleDirection, days: number = 1) {
    await assertCanManageTasks()
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
    await assertCanManageTasks()
    const supabase = await createClient()

    const isValidTargetType = targetType === 'employee' || targetType === 'role' || targetType === 'all_crew'
    if (!isValidTargetType) {
        throw new Error('Invalid target type')
    }
    if ((targetType === 'employee' || targetType === 'role') && !targetId) {
        throw new Error(`Target ID is required for ${targetType} reassignment`)
    }

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
    await assertCanManageTasks()
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
    await assertCanManageTasks()
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

export async function deleteTaskInstance(instanceId: string) {
    await assertCanManageTasks()
    const supabase = await createClient()

    // 1. Load the instance and its parent assignment info
    const { data: instance, error: fetchErr } = await supabase
        .from('task_assignment_instances')
        .select(`
            id,
            task_assignment_id,
            is_override
        `)
        .eq('id', instanceId)
        .single()

    if (fetchErr || !instance) {
        throw new Error('Could not find task instance')
    }

    // First-pass safeguard: only allow ad-hoc / override tasks
    if (!instance.is_override) {
        throw new Error('Delete currently supports ad-hoc tasks only')
    }

    // 2. Delete child targets first
    const { error: targetsErr } = await supabase
        .from('task_assignment_instance_targets')
        .delete()
        .eq('task_assignment_instance_id', instanceId)

    if (targetsErr) {
        throw new Error('Failed to delete task targets: ' + targetsErr.message)
    }

    // 3. Delete child logs
    const { error: logsErr } = await supabase
        .from('task_item_logs')
        .delete()
        .eq('task_assignment_instance_id', instanceId)

    if (logsErr) {
        throw new Error('Failed to delete task logs: ' + logsErr.message)
    }

    // 4. Delete the instance
    const { error: instanceErr } = await supabase
        .from('task_assignment_instances')
        .delete()
        .eq('id', instanceId)

    if (instanceErr) {
        throw new Error('Failed to delete task instance: ' + instanceErr.message)
    }

    // 5. Delete the parent ad-hoc assignment if it exists
    if (instance.task_assignment_id) {
        const { error: assignmentErr } = await supabase
            .from('task_assignments')
            .delete()
            .eq('id', instance.task_assignment_id)

        if (assignmentErr) {
            throw new Error('Failed to delete parent task assignment: ' + assignmentErr.message)
        }
    }

    revalidatePath('/dashboard/tasks/scheduler')
    revalidatePath('/dashboard/tasks')
    revalidatePath('/dashboard/tasks/admin')
    revalidatePath('/dashboard/crew')

    return { success: true }
}

export async function reorderTaskInstance(
    instanceId: string,
    direction: 'up' | 'down'
) {
    await assertCanManageTasks()
    const supabase = await createClient()

    // 1. Load the current instance
    const { data: current, error: currentErr } = await supabase
        .from('task_assignment_instances')
        .select('id, assignment_date, sequence_order, created_at')
        .eq('id', instanceId)
        .single()

    if (currentErr || !current) {
        throw new Error('Could not find task instance')
    }

    // 2. Load all instances for the same day
    const { data: sameDayRows, error: dayErr } = await supabase
        .from('task_assignment_instances')
        .select('id, assignment_date, sequence_order, created_at')
        .eq('assignment_date', current.assignment_date)
        .order('sequence_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })

    if (dayErr) {
        throw new Error('Failed to load same-day tasks: ' + dayErr.message)
    }

    const rows = sameDayRows || []

    if (rows.length <= 1) {
        return { success: true, message: 'Nothing to reorder' }
    }

    // 3. Normalize sequence_order for this day so every row has a clean integer
    for (let i = 0; i < rows.length; i++) {
        const desiredOrder = i + 1
        if (rows[i].sequence_order !== desiredOrder) {
            const { error: normalizeErr } = await supabase
                .from('task_assignment_instances')
                .update({ sequence_order: desiredOrder })
                .eq('id', rows[i].id)

            if (normalizeErr) {
                throw new Error('Failed to normalize task order: ' + normalizeErr.message)
            }

            rows[i].sequence_order = desiredOrder
        }
    }

    const currentIndex = rows.findIndex((row) => row.id === instanceId)

    if (currentIndex === -1) {
        throw new Error('Current task not found in same-day ordering')
    }

    const neighborIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (neighborIndex < 0 || neighborIndex >= rows.length) {
        return { success: true, message: `Task is already at the ${direction === 'up' ? 'top' : 'bottom'}` }
    }

    const currentRow = rows[currentIndex]
    const neighborRow = rows[neighborIndex]

    const currentOrder = currentRow.sequence_order
    const neighborOrder = neighborRow.sequence_order

    // 4. Swap sequence_order values
    const { error: swapErr1 } = await supabase
        .from('task_assignment_instances')
        .update({ sequence_order: neighborOrder })
        .eq('id', currentRow.id)

    if (swapErr1) {
        throw new Error('Failed to update current task order: ' + swapErr1.message)
    }

    const { error: swapErr2 } = await supabase
        .from('task_assignment_instances')
        .update({ sequence_order: currentOrder })
        .eq('id', neighborRow.id)

    if (swapErr2) {
        throw new Error('Failed to update neighbor task order: ' + swapErr2.message)
    }

    revalidatePath('/dashboard/tasks/scheduler')
    revalidatePath('/dashboard/tasks')
    revalidatePath('/dashboard/tasks/admin')

    return { success: true }
}
