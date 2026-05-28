'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/service'
import { revalidatePath } from 'next/cache'
import { mergeChecklistInputs } from './checklistInputs'
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

    return { supabase, employeeId: employee.id, userId: user.id }
}

async function getCurrentUserId() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error('Unauthorized: user not authenticated')
    }
    return user.id
}

type TaskInstanceStatus = 'scheduled' | 'active' | 'completed' | 'cancelled' | 'reopened'

const CREW_UNDO_WINDOW_MINUTES = 10

function normalizeChecklistTitles(
    checklistItems: string[],
    bulkText = '',
    singleFallbackTitle?: string
): string[] {
    const merged = mergeChecklistInputs(checklistItems, bulkText)
    if (merged.length > 0) return merged
    if (singleFallbackTitle?.trim()) return [singleFallbackTitle.trim()]
    return []
}

async function createChecklistTemplateAndItems(
    admin: ReturnType<typeof createAdminClient>,
    taskTitle: string,
    checklistTitles: string[]
) {
    const normalized = normalizeChecklistTitles(checklistTitles)
    if (normalized.length === 0) {
        return { templateId: null, sectionId: null, itemCount: 0 }
    }

    const { data: template, error: templateErr } = await admin
        .from('task_templates')
        .insert([{
            title: `${taskTitle.trim()} (Checklist)`,
            description: 'Checklist generated from scheduler task builder',
            default_display_mode: 'full'
        }])
        .select('id')
        .single()

    if (templateErr || !template) {
        throw new Error(`Failed to create checklist template: ${templateErr.message}`)
    }

    const templateId = template.id

    const { data: section, error: sectionErr } = await admin
        .from('task_template_sections')
        .insert([{
            task_template_id: templateId,
            title: 'Checklist',
            sort_order: 1
        }])
        .select('id')
        .single()

    if (sectionErr || !section) {
        throw new Error(`Failed to create checklist section: ${sectionErr.message}`)
    }

    const rows = normalized.map((title, idx) => ({
        section_id: section.id,
        title,
        sort_order: idx + 1
    }))

    const { error: itemsErr } = await admin.from('task_template_items').insert(rows)

    if (itemsErr) {
        throw new Error(`Failed to create checklist items: ${itemsErr.message}`)
    }

    return {
        templateId,
        sectionId: section.id,
        itemCount: rows.length
    }
}

async function assertTemplateHasChecklist(
    admin: ReturnType<typeof createAdminClient>,
    templateId: string,
    expectedItemCount: number
) {
    if (expectedItemCount === 0) return

    const { data: sections, error: sectionErr } = await admin
        .from('task_template_sections')
        .select('id')
        .eq('task_template_id', templateId)

    if (sectionErr) {
        throw new Error(`Failed to verify checklist sections: ${sectionErr.message}`)
    }

    const sectionIds = (sections || []).map((row: { id: string }) => row.id)
    if (sectionIds.length === 0) {
        throw new Error(
            `Checklist template was created but no sections were saved (template_id=${templateId}).`
        )
    }

    const { data: items, error: itemErr } = await admin
        .from('task_template_items')
        .select('id')
        .in('section_id', sectionIds)

    if (itemErr) {
        throw new Error(`Failed to verify checklist items: ${itemErr.message}`)
    }

    const itemCount = (items || []).length
    if (itemCount < expectedItemCount) {
        throw new Error(
            `Checklist items were not saved completely (expected ${expectedItemCount}, saved ${itemCount}, template_id=${templateId}).`
        )
    }
}

export async function getTaskChecklistVerification(instanceId: string) {
    await assertCanManageTasks()
    const admin = createAdminClient()

    const { data: instance, error: instanceErr } = await admin
        .from('task_assignment_instances')
        .select('id, title, task_assignment_id, status')
        .eq('id', instanceId)
        .single()

    if (instanceErr || !instance) {
        throw new Error('Task instance not found')
    }

    let templateId: string | null = null
    if (instance.task_assignment_id) {
        const { data: assignment } = await admin
            .from('task_assignments')
            .select('task_template_id')
            .eq('id', instance.task_assignment_id)
            .maybeSingle()
        templateId = assignment?.task_template_id ?? null
    }

    let sections: Array<{ id: string, title: string, sort_order: number }> | null = null
    if (templateId) {
        const { data } = await admin
            .from('task_template_sections')
            .select('id, title, sort_order')
            .eq('task_template_id', templateId)
            .order('sort_order')
        sections = data
    }

    const sectionIds = (sections || []).map((row) => row.id)
    let items: Array<{ id: string, title: string, sort_order: number, section_id: string }> = []
    if (sectionIds.length > 0) {
        const { data } = await admin
            .from('task_template_items')
            .select('id, title, sort_order, section_id')
            .in('section_id', sectionIds)
            .order('sort_order')
        items = data || []
    }

    return {
        instanceId: instance.id,
        assignmentId: instance.task_assignment_id,
        templateId,
        sectionCount: sectionIds.length,
        itemCount: items.length,
        itemTitles: items.map((row) => row.title)
    }
}

async function assertCrewAssignedToInstance(supabase: any, instanceId: string, employeeId: string) {
    const { data, error } = await supabase
        .from('task_assignment_instance_targets')
        .select('id, target_type, employee_id, role_id')
        .eq('task_assignment_instance_id', instanceId)

    if (error) {
        throw new Error('Could not validate task assignment access')
    }

    const targets = data || []
    const hasAllCrewTarget = targets.some((t: any) => t.target_type === 'all_crew')
    const hasEmployeeTarget = targets.some((t: any) => t.target_type === 'employee' && t.employee_id === employeeId)

    let hasRoleTarget = false
    if (!hasAllCrewTarget && !hasEmployeeTarget) {
        const roleIds = targets
            .filter((t: any) => t.target_type === 'role' && t.role_id)
            .map((t: any) => t.role_id)
        if (roleIds.length > 0) {
            const { data: employeeRoles } = await supabase
                .from('employee_roles')
                .select('role_id')
                .eq('employee_id', employeeId)
                .in('role_id', roleIds)
            hasRoleTarget = (employeeRoles || []).length > 0
        }
    }

    if (!hasAllCrewTarget && !hasEmployeeTarget && !hasRoleTarget) {
        throw new Error('Unauthorized: task is not assigned to this crew member')
    }
}

async function updateTaskInstanceStatusWithAudit({
    instanceId,
    nextStatus,
    expectedCurrentStatus,
    changedByUserId,
    changedByEmployeeId,
    note
}: {
    instanceId: string
    nextStatus: TaskInstanceStatus
    expectedCurrentStatus?: TaskInstanceStatus
    changedByUserId: string
    changedByEmployeeId?: string | null
    note?: string | null
}) {
    const admin = createAdminClient()

    const { data: current, error: currentErr } = await admin
        .from('task_assignment_instances')
        .select('id, status')
        .eq('id', instanceId)
        .single()

    if (currentErr || !current) {
        throw new Error('Task instance not found')
    }

    const previousStatus = current.status as TaskInstanceStatus

    if (expectedCurrentStatus && previousStatus !== expectedCurrentStatus) {
        throw new Error(`Task status changed by someone else. Current status: ${previousStatus}`)
    }

    if (previousStatus === nextStatus) {
        return { previousStatus, newStatus: nextStatus, changed: false }
    }

    const updateQuery = admin
        .from('task_assignment_instances')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', instanceId)
        .eq('status', previousStatus)
        .select('id')

    const { data: updatedRows, error: updateErr } = await updateQuery

    if (updateErr || !updatedRows || updatedRows.length === 0) {
        throw new Error('Failed to update task status. Please refresh and try again.')
    }

    const { error: historyErr } = await admin
        .from('task_instance_status_history')
        .insert([{
            task_assignment_instance_id: instanceId,
            previous_status: previousStatus,
            new_status: nextStatus,
            changed_by_user_id: changedByUserId,
            changed_by_employee_id: changedByEmployeeId || null,
            change_note: note || null
        }])

    if (historyErr) {
        throw new Error('Status updated, but failed to write audit history: ' + historyErr.message)
    }

    revalidatePath('/dashboard/crew')
    revalidatePath('/dashboard/tasks')
    revalidatePath('/dashboard/tasks/admin')
    revalidatePath('/dashboard/tasks/scheduler')

    return { previousStatus, newStatus: nextStatus, changed: true }
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

export async function toggleTaskItemStatus(
    instanceId: string,
    templateItemId: string | null,
    isCompleted: boolean
) {
    const { supabase, employeeId: actorEmployeeId } = await getCurrentEmployeeId()
    await assertCrewAssignedToInstance(supabase, instanceId, actorEmployeeId)

    const { error } = await supabase
        .from('task_item_logs')
        .insert([{
            task_assignment_instance_id: instanceId,
            task_template_item_id: templateItemId,
            employee_id: actorEmployeeId,
            status: isCompleted ? 'completed' : 'unchecked',
            logged_at: new Date().toISOString()
        }])

    if (error) {
        throw new Error('Failed to update checklist item: ' + error.message)
    }
    revalidatePath('/dashboard/crew')
    revalidatePath('/dashboard/tasks')
    return { success: true }
}

export async function completeTaskInstanceAsCrew(instanceId: string, note?: string) {
    const { supabase, employeeId, userId } = await getCurrentEmployeeId()
    await assertCrewAssignedToInstance(supabase, instanceId, employeeId)

    return updateTaskInstanceStatusWithAudit({
        instanceId,
        nextStatus: 'completed',
        changedByUserId: userId,
        changedByEmployeeId: employeeId,
        note: note || 'Crew marked task complete'
    })
}

export async function startTaskInstanceAsCrew(instanceId: string, note?: string) {
    const { supabase, employeeId, userId } = await getCurrentEmployeeId()
    await assertCrewAssignedToInstance(supabase, instanceId, employeeId)

    const { data: current, error } = await supabase
        .from('task_assignment_instances')
        .select('status')
        .eq('id', instanceId)
        .single()

    if (error || !current) {
        throw new Error('Task instance not found')
    }

    const currentStatus = current.status as TaskInstanceStatus | null
    if (!currentStatus || (currentStatus !== 'scheduled' && currentStatus !== 'reopened')) {
        throw new Error(`Task can only be started from Scheduled or Reopened. Current: ${currentStatus || 'unknown'}`)
    }

    return updateTaskInstanceStatusWithAudit({
        instanceId,
        expectedCurrentStatus: currentStatus,
        nextStatus: 'active',
        changedByUserId: userId,
        changedByEmployeeId: employeeId,
        note: note || 'Crew started task'
    })
}

export async function undoTaskCompletionAsCrew(instanceId: string) {
    const { supabase, employeeId, userId } = await getCurrentEmployeeId()
    await assertCrewAssignedToInstance(supabase, instanceId, employeeId)

    const admin = createAdminClient()
    const { data: latestHistory, error: historyErr } = await admin
        .from('task_instance_status_history')
        .select('id, previous_status, new_status, changed_by_user_id, created_at')
        .eq('task_assignment_instance_id', instanceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (historyErr) {
        throw new Error('Could not load status history for undo')
    }

    if (!latestHistory || latestHistory.new_status !== 'completed') {
        throw new Error('Undo unavailable: latest task status is not a completion action')
    }

    if (latestHistory.changed_by_user_id !== userId) {
        throw new Error('Undo window expired or task was completed by another user')
    }

    const completedAt = new Date(latestHistory.created_at).getTime()
    const windowMs = CREW_UNDO_WINDOW_MINUTES * 60 * 1000
    if (Date.now() - completedAt > windowMs) {
        throw new Error(`Undo window has passed (${CREW_UNDO_WINDOW_MINUTES} minutes)`)
    }

    const revertStatus = (latestHistory.previous_status || 'active') as TaskInstanceStatus

    return updateTaskInstanceStatusWithAudit({
        instanceId,
        expectedCurrentStatus: 'completed',
        nextStatus: revertStatus,
        changedByUserId: userId,
        changedByEmployeeId: employeeId,
        note: `Crew undo within ${CREW_UNDO_WINDOW_MINUTES} minute window`
    })
}

export async function requestTaskReopenAsCrew(instanceId: string, note?: string) {
    const { supabase, employeeId, userId } = await getCurrentEmployeeId()
    await assertCrewAssignedToInstance(supabase, instanceId, employeeId)

    const admin = createAdminClient()
    const { error } = await admin
        .from('task_status_change_requests')
        .insert([{
            task_assignment_instance_id: instanceId,
            requested_by_user_id: userId,
            requested_by_employee_id: employeeId,
            requested_status: 'reopened',
            note: note || null,
            status: 'pending'
        }])

    if (error) {
        throw new Error('Failed to submit reopen request: ' + error.message)
    }

    revalidatePath('/dashboard/tasks')
    revalidatePath('/dashboard/crew')
    revalidatePath('/dashboard/tasks/admin')
    return { success: true }
}

export async function adminSetTaskInstanceStatus(
    instanceId: string,
    nextStatus: TaskInstanceStatus,
    note?: string
) {
    await assertCanManageTasks()
    const userId = await getCurrentUserId()

    return updateTaskInstanceStatusWithAudit({
        instanceId,
        nextStatus,
        changedByUserId: userId,
        note: note || 'Task status updated by admin/manager'
    })
}

export async function cancelTaskInstanceAsAdmin(instanceId: string, note?: string) {
    return adminSetTaskInstanceStatus(instanceId, 'cancelled', note || 'Task cancelled by admin')
}

export async function getTaskInstanceEditPayload(instanceId: string) {
    await assertCanManageTasks()
    const admin = createAdminClient()

    const { data: instance, error: instanceErr } = await admin
        .from('task_assignment_instances')
        .select(`
            id,
            task_assignment_id,
            assignment_date,
            title,
            display_mode,
            is_override,
            status
        `)
        .eq('id', instanceId)
        .single()

    if (instanceErr || !instance) {
        throw new Error('Task instance not found')
    }

    const { data: targets } = await admin
        .from('task_assignment_instance_targets')
        .select('target_type, employee_id, role_id')
        .eq('task_assignment_instance_id', instanceId)

    let taskTemplateId: string | null = null
    if (instance.task_assignment_id) {
        const { data: assignment } = await admin
            .from('task_assignments')
            .select('task_template_id')
            .eq('id', instance.task_assignment_id)
            .maybeSingle()
        taskTemplateId = assignment?.task_template_id || null
    }

    let checklistItems: Array<{ id: string, title: string, sort_order: number }> = []
    if (taskTemplateId) {
        const { data: sections } = await admin
            .from('task_template_sections')
            .select(`
                id,
                task_template_items (
                    id,
                    title,
                    sort_order
                )
            `)
            .eq('task_template_id', taskTemplateId)

        checklistItems = (sections || []).flatMap((sec: any) => sec.task_template_items || [])
        checklistItems.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
    }

    const target = targets?.[0]
    return {
        instanceId: instance.id,
        dateStr: instance.assignment_date,
        title: instance.title || '',
        displayMode: instance.display_mode || 'full',
        status: instance.status || 'scheduled',
        targetType: target?.target_type || 'all_crew',
        targetId: (target?.employee_id || target?.role_id || '') as string,
        checklistItems: checklistItems.map(item => item.title)
    }
}

export async function updateTaskInstanceDetailsAsAdmin(params: {
    instanceId: string
    dateStr: string
    title: string
    targetType: 'employee' | 'role' | 'all_crew'
    targetId?: string
    checklistItems: string[]
    bulkChecklistText?: string
}) {
    await assertCanManageTasks()
    const admin = createAdminClient()

    const {
        instanceId,
        dateStr,
        title,
        targetType,
        targetId,
        checklistItems,
        bulkChecklistText = ''
    } = params

    const trimmedTitle = title.trim()
    if (!trimmedTitle) throw new Error('Task title is required')
    if (!dateStr) throw new Error('Assignment date is required')
    if ((targetType === 'employee' || targetType === 'role') && !targetId) {
        throw new Error(`Target ID is required for ${targetType}`)
    }

    const normalizedChecklist = normalizeChecklistTitles(checklistItems, bulkChecklistText)

    const { data: instance, error: instanceErr } = await admin
        .from('task_assignment_instances')
        .select('id, task_assignment_id')
        .eq('id', instanceId)
        .single()

    if (instanceErr || !instance) {
        throw new Error('Task instance not found')
    }

    let assignmentId = instance.task_assignment_id as string | null
    if (!assignmentId) {
        const { data: newAssignment, error: newAssignmentErr } = await admin
            .from('task_assignments')
            .insert([{
                task_template_id: null,
                assignment_date: dateStr,
                title: trimmedTitle,
                display_mode: 'full'
            }])
            .select('id')
            .single()
        if (newAssignmentErr || !newAssignment) {
            throw new Error('Failed to create parent assignment: ' + newAssignmentErr?.message)
        }
        assignmentId = newAssignment.id

        const { error: linkErr } = await admin
            .from('task_assignment_instances')
            .update({ task_assignment_id: assignmentId })
            .eq('id', instanceId)
        if (linkErr) throw new Error('Failed to link assignment to instance: ' + linkErr.message)
    }

    let templateId: string | null = null
    if (assignmentId) {
        const { data: existingAssignment } = await admin
            .from('task_assignments')
            .select('task_template_id')
            .eq('id', assignmentId)
            .maybeSingle()
        templateId = existingAssignment?.task_template_id ?? null
    }

    if (normalizedChecklist.length > 0) {
        const created = await createChecklistTemplateAndItems(admin, trimmedTitle, normalizedChecklist)
        if (!created.templateId) {
            throw new Error('Checklist template was not created.')
        }
        templateId = created.templateId
        await assertTemplateHasChecklist(admin, templateId, normalizedChecklist.length)
    }

    const { error: assignmentErr } = await admin
        .from('task_assignments')
        .update({
            assignment_date: dateStr,
            title: trimmedTitle,
            display_mode: 'full',
            task_template_id: templateId
        })
        .eq('id', assignmentId)
    if (assignmentErr) throw new Error('Failed to update task assignment: ' + assignmentErr.message)

    const { error: instanceUpdateErr } = await admin
        .from('task_assignment_instances')
        .update({
            assignment_date: dateStr,
            title: trimmedTitle,
            display_mode: 'full',
            is_override: true,
            updated_at: new Date().toISOString()
        })
        .eq('id', instanceId)
    if (instanceUpdateErr) throw new Error('Failed to update task instance: ' + instanceUpdateErr.message)

    const { error: wipeTargetErr } = await admin
        .from('task_assignment_instance_targets')
        .delete()
        .eq('task_assignment_instance_id', instanceId)
    if (wipeTargetErr) throw new Error('Failed to clear previous targets: ' + wipeTargetErr.message)

    if (targetType === 'employee' && targetId) {
        const { error } = await admin
            .from('task_assignment_instance_targets')
            .insert([{ task_assignment_instance_id: instanceId, target_type: 'employee', employee_id: targetId }])
        if (error) throw new Error('Failed to assign employee target: ' + error.message)
    } else if (targetType === 'role' && targetId) {
        const { error } = await admin
            .from('task_assignment_instance_targets')
            .insert([{ task_assignment_instance_id: instanceId, target_type: 'role', role_id: targetId }])
        if (error) throw new Error('Failed to assign role target: ' + error.message)
    } else {
        const { error } = await admin
            .from('task_assignment_instance_targets')
            .insert([{ task_assignment_instance_id: instanceId, target_type: 'all_crew' }])
        if (error) throw new Error('Failed to assign all crew target: ' + error.message)
    }

    revalidatePath('/dashboard/tasks/scheduler')
    revalidatePath('/dashboard/tasks/admin')
    revalidatePath('/dashboard/tasks')
    revalidatePath('/dashboard/crew')

    const checklistVerification = await getTaskChecklistVerification(instanceId)
    if (normalizedChecklist.length > 0 && checklistVerification.itemCount === 0) {
        throw new Error(
            'Task saved but checklist items are missing in the database. Re-open Edit Task and save checklist again.'
        )
    }

    return { success: true, checklistVerification }
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
    targetId?: string,
    checklistItems: string[] = [],
    bulkChecklistText = ''
) {
    await assertCanManageTasks()
    const trimmedTitle = title?.trim() || ''
    if (!trimmedTitle) throw new Error('Task title is required.')
    if (!dateStr) throw new Error('Assignment date is required.')
    if (targetType === 'employee' && !targetId) throw new Error('Employee target requires an employee ID.')
    if (targetType === 'role' && !targetId) throw new Error('Role target requires a role ID.')

    const admin = createAdminClient()
    const normalizedChecklist = normalizeChecklistTitles(checklistItems, bulkChecklistText)

    let adHocTemplateId: string | null = null
    if (normalizedChecklist.length > 0) {
        const created = await createChecklistTemplateAndItems(admin, trimmedTitle, normalizedChecklist)
        if (!created.templateId) {
            throw new Error('Checklist template was not created.')
        }
        adHocTemplateId = created.templateId
        await assertTemplateHasChecklist(admin, adHocTemplateId, normalizedChecklist.length)
    }

    const resolvedDisplayMode = normalizedChecklist.length > 0 ? 'full' : displayMode

    const { data: assignment, error: assignErr } = await admin
        .from('task_assignments')
        .insert([{
            task_template_id: adHocTemplateId,
            assignment_date: dateStr,
            title: trimmedTitle,
            display_mode: resolvedDisplayMode
        }])
        .select('id')
        .single()

    if (assignErr || !assignment) {
        throw new Error('Failed to create ad hoc parent assignment: ' + assignErr?.message)
    }

    const { data: instance, error: instanceErr } = await admin
        .from('task_assignment_instances')
        .insert([{
            task_assignment_id: assignment.id,
            assignment_date: dateStr,
            title: trimmedTitle,
            display_mode: resolvedDisplayMode,
            is_override: true,
            status: 'scheduled'
        }])
        .select('id')
        .single()

    if (instanceErr || !instance) {
        throw new Error('Failed to schedule custom task instance: ' + instanceErr?.message)
    }

    if (targetType === 'employee' && targetId) {
        const { error } = await admin
            .from('task_assignment_instance_targets')
            .insert([{ task_assignment_instance_id: instance.id, target_type: 'employee', employee_id: targetId }])
        if (error) throw new Error('Failed to assign employee target: ' + error.message)
    } else if (targetType === 'role' && targetId) {
        const { error } = await admin
            .from('task_assignment_instance_targets')
            .insert([{ task_assignment_instance_id: instance.id, target_type: 'role', role_id: targetId }])
        if (error) throw new Error('Failed to assign role target: ' + error.message)
    } else if (targetType === 'all_crew') {
        const { error } = await admin
            .from('task_assignment_instance_targets')
            .insert([{ task_assignment_instance_id: instance.id, target_type: 'all_crew' }])
        if (error) throw new Error('Failed to assign all_crew target: ' + error.message)
    }

    const checklistVerification = await getTaskChecklistVerification(instance.id)
    if (normalizedChecklist.length > 0) {
        if (checklistVerification.sectionCount === 0 || checklistVerification.itemCount === 0) {
            throw new Error(
                `Task was created but checklist data is missing (sections=${checklistVerification.sectionCount}, items=${checklistVerification.itemCount}).`
            )
        }
        if (checklistVerification.itemCount < normalizedChecklist.length) {
            throw new Error(
                `Task was created but only ${checklistVerification.itemCount} of ${normalizedChecklist.length} checklist items were saved.`
            )
        }
    }

    revalidatePath('/dashboard/tasks/scheduler')
    revalidatePath('/dashboard/tasks')
    revalidatePath('/dashboard/tasks/admin')
    revalidatePath('/dashboard/crew')

    return { success: true, instanceId: instance.id, checklistVerification }
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
