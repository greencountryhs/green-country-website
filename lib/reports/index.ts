'use server'

import { createClient } from '@/utils/supabase/server'
import { CAPABILITIES } from '@/lib/auth/capabilities'
import { requireCapability } from '@/lib/auth/requireCapability'
import { revalidatePath } from 'next/cache'

export async function getMissingClockOuts(filters?: { employeeId?: string, startDate?: string, endDate?: string }) {
    const isAuthorized = await requireCapability(CAPABILITIES.VIEW_TIME_REPORTS)
    if (!isAuthorized) throw new Error("Unauthorized to view time reports")

    const supabase = await createClient()
    let query = supabase
        .from('time_entry_report_view')
        .select('id, employee_id, employee_name, clock_in, work_date, manual_entry, was_edited')
        .eq('missing_clock_out', true)
        .order('clock_in', { ascending: false })

    if (filters?.employeeId) query = query.eq('employee_id', filters.employeeId)
    if (filters?.startDate) query = query.gte('work_date', filters.startDate)
    if (filters?.endDate) query = query.lte('work_date', filters.endDate)

    const { data, error } = await query
    if (error) console.error("Error fetching missing clock outs:", error)
    return data || []
}

export async function getRecentTimeEntries(limit: number = 100, filters?: { employeeId?: string, startDate?: string, endDate?: string }) {
    const isAuthorized = await requireCapability(CAPABILITIES.VIEW_TIME_REPORTS)
    if (!isAuthorized) throw new Error("Unauthorized to view time reports")

    const supabase = await createClient()
    let query = supabase
        .from('time_entry_report_view')
        .select('id, employee_id, employee_name, work_date, clock_in, clock_out, duration_hours, manual_entry, was_edited')
        .order('clock_in', { ascending: false })
        .limit(limit)

    if (filters?.employeeId) query = query.eq('employee_id', filters.employeeId)
    if (filters?.startDate) query = query.gte('work_date', filters.startDate)
    if (filters?.endDate) query = query.lte('work_date', filters.endDate)

    const { data, error } = await query
    if (error) console.error("Error fetching recent time entries:", error)
    return data || []
}

export async function getWeeklyHoursReport(filters?: { employeeId?: string, startDate?: string, endDate?: string }) {
    const isAuthorized = await requireCapability(CAPABILITIES.VIEW_TIME_REPORTS)
    if (!isAuthorized) throw new Error("Unauthorized to view time reports")

    const supabase = await createClient()
    let query = supabase
        .from('time_entry_report_view')
        .select('employee_id, employee_name, week_start, duration_hours')
        .eq('missing_clock_out', false)

    if (filters?.employeeId) query = query.eq('employee_id', filters.employeeId)
    if (filters?.startDate) query = query.gte('work_date', filters.startDate)
    if (filters?.endDate) query = query.lte('work_date', filters.endDate)

    const { data, error } = await query
    if (error) {
        console.error("Error fetching weekly hours:", error)
        return []
    }

    // Grouping by employee and week in Javascript since Supabase JS doesn't support GROUP BY natively on views without RPCs
    const grouped = new Map<string, any>()
    data.forEach(row => {
        const key = `${row.employee_id}_${row.week_start}`
        if (!grouped.has(key)) {
            grouped.set(key, {
                employee_id: row.employee_id,
                employee_name: row.employee_name,
                week_start: row.week_start,
                total_hours: 0
            })
        }
        const group = grouped.get(key)
        group.total_hours += Number(row.duration_hours || 0)
    })

    const results = Array.from(grouped.values()).map(r => ({
        ...r,
        total_hours: Math.round(r.total_hours * 100) / 100
    }))

    // Sort by week desc, name asc
    results.sort((a, b) => {
        if (a.week_start > b.week_start) return -1
        if (a.week_start < b.week_start) return 1
        return a.employee_name.localeCompare(b.employee_name)
    })

    return results
}

export async function correctTimeEntry(entryId: string, newClockIn: string, newClockOut: string | null, reason: string) {
    const isAuthorized = await requireCapability(CAPABILITIES.VIEW_TIME_REPORTS)
    if (!isAuthorized) throw new Error("Unauthorized to edit time entries")

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Unauthorized")

    const { error } = await supabase
        .from('time_entries')
        .update({
            clock_in: newClockIn,
            clock_out: newClockOut,
            edited_at: new Date().toISOString(),
            edited_by: user.id,
            edit_reason: reason
        })
        .eq('id', entryId)

    if (error) console.error("Error correcting time entry:", error)
    revalidatePath('/dashboard/reports')
    return { error }
}

export async function createManualTimeEntry(employeeId: string, clockIn: string, clockOut: string, reason: string) {
    const isAuthorized = await requireCapability(CAPABILITIES.VIEW_TIME_REPORTS)
    if (!isAuthorized) throw new Error("Unauthorized to create time entries")

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Unauthorized")

    const { error } = await supabase
        .from('time_entries')
        .insert([{
            employee_id: employeeId,
            clock_in: clockIn,
            clock_out: clockOut,
            manual_entry: true,
            edited_at: new Date().toISOString(),
            edited_by: user.id,
            edit_reason: reason
        }])

    if (error) console.error("Error creating manual time entry:", error)
    revalidatePath('/dashboard/reports')
    return { error }
}

export async function deleteTimeEntry(entryId: string, reason?: string) {
    const isAuthorized = await requireCapability(CAPABILITIES.VIEW_TIME_REPORTS)
    if (!isAuthorized) throw new Error("Unauthorized to delete time entries")

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Unauthorized")

    // Optionally you'd log the reason to an audit table here.
    const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', entryId)

    if (error) console.error("Error deleting time entry:", error)
    revalidatePath('/dashboard/reports')
    return { error }
}
