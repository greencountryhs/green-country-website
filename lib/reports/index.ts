'use server'

import { createClient } from '@/utils/supabase/server'
import { CAPABILITIES } from '@/lib/auth/capabilities'
import { requireCapability } from '@/lib/auth/requireCapability'
import { revalidatePath } from 'next/cache'

// We will shift all UTC dates to local 'America/Chicago' dates for bucketing
function getLocalBusinessDateString(utcIsoString: string) {
    // Return YYYY-MM-DD in America/Chicago
    const d = new Date(utcIsoString);
    return new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'America/Chicago', 
        year: 'numeric', month: '2-digit', day: '2-digit' 
    }).format(d);
}

function getLocalWeekStart(utcIsoString: string) {
    const d = new Date(utcIsoString);
    const localDateStr = getLocalBusinessDateString(utcIsoString);
    const [y, m, day] = localDateStr.split('-').map(Number);
    const localD = new Date(y, m - 1, day);
    
    // Monday as start of week
    const currentDay = localD.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    
    localD.setDate(localD.getDate() + diffToMonday);
    
    return `${localD.getFullYear()}-${String(localD.getMonth() + 1).padStart(2, '0')}-${String(localD.getDate()).padStart(2, '0')}`;
}

export async function getMissingClockOuts(filters?: { employeeId?: string, startDate?: string, endDate?: string }) {
    const isAuthorized = await requireCapability(CAPABILITIES.VIEW_TIME_REPORTS)
    if (!isAuthorized) throw new Error("Unauthorized to view time reports")

    const supabase = await createClient()
    let query = supabase
        .from('time_entries')
        .select(`
            id, employee_id, clock_in, clock_out, manual_entry, edited_at,
            employees ( display_name )
        `)
        .is('clock_out', null)
        .order('clock_in', { ascending: false })

    if (filters?.employeeId) query = query.eq('employee_id', filters.employeeId)

    const { data, error } = await query
    if (error) console.error("Error fetching missing clock outs:", error)
    
    const results = (data || []).map((t: any) => ({
        id: t.id,
        employee_id: t.employee_id,
        employee_name: t.employees?.display_name || 'Unknown',
        clock_in: t.clock_in,
        work_date: getLocalBusinessDateString(t.clock_in),
        manual_entry: t.manual_entry,
        was_edited: t.edited_at !== null
    }));

    return results.filter(r => {
        if (filters?.startDate && r.work_date < filters.startDate) return false;
        if (filters?.endDate && r.work_date > filters.endDate) return false;
        return true;
    });
}

export async function getRecentTimeEntries(limit: number = 100, filters?: { employeeId?: string, startDate?: string, endDate?: string }) {
    const isAuthorized = await requireCapability(CAPABILITIES.VIEW_TIME_REPORTS)
    if (!isAuthorized) throw new Error("Unauthorized to view time reports")

    const supabase = await createClient()
    let query = supabase
        .from('time_entries')
        .select(`
            id, employee_id, clock_in, clock_out, manual_entry, edited_at, edit_reason,
            clock_out_work_summary, clock_out_day_notes, clock_out_supply_needs, clock_out_blockers, clock_out_follow_up_needed,
            employees ( display_name )
        `)
        .order('clock_in', { ascending: false })
        .limit(limit)

    if (filters?.employeeId) query = query.eq('employee_id', filters.employeeId)

    const { data, error } = await query
    if (error) console.error("Error fetching recent time entries:", error)
    
    const results = (data || []).map((t: any) => {
        let duration = 0;
        if (t.clock_out) {
            duration = (new Date(t.clock_out).getTime() - new Date(t.clock_in).getTime()) / 3600000;
        }
        return {
            id: t.id,
            employee_id: t.employee_id,
            employee_name: t.employees?.display_name || 'Unknown',
            work_date: getLocalBusinessDateString(t.clock_in),
            clock_in: t.clock_in,
            clock_out: t.clock_out,
            duration_hours: duration,
            manual_entry: t.manual_entry,
            was_edited: t.edited_at !== null,
            edit_reason: t.edit_reason ?? null,
            clock_out_work_summary: t.clock_out_work_summary ?? null,
            clock_out_day_notes: t.clock_out_day_notes ?? null,
            clock_out_supply_needs: t.clock_out_supply_needs ?? null,
            clock_out_blockers: t.clock_out_blockers ?? null,
            clock_out_follow_up_needed: !!t.clock_out_follow_up_needed
        };
    });

    return results.filter(r => {
        if (filters?.startDate && r.work_date < filters.startDate) return false;
        if (filters?.endDate && r.work_date > filters.endDate) return false;
        return true;
    });
}

export async function getWeeklyHoursReport(filters?: { employeeId?: string, startDate?: string, endDate?: string }) {
    const isAuthorized = await requireCapability(CAPABILITIES.VIEW_TIME_REPORTS)
    if (!isAuthorized) throw new Error("Unauthorized to view time reports")

    const supabase = await createClient()
    let query = supabase
        .from('time_entries')
        .select(`
            employee_id, clock_in, clock_out,
            employees ( display_name )
        `)
        .not('clock_out', 'is', null)

    if (filters?.employeeId) query = query.eq('employee_id', filters.employeeId)

    const { data, error } = await query
    if (error) {
        console.error("Error fetching weekly hours:", error)
        return []
    }

    const grouped = new Map<string, any>()
    data.forEach((row: any) => {
        const localWorkDate = getLocalBusinessDateString(row.clock_in);
        if (filters?.startDate && localWorkDate < filters.startDate) return;
        if (filters?.endDate && localWorkDate > filters.endDate) return;

        const weekStart = getLocalWeekStart(row.clock_in);
        const key = `${row.employee_id}_${weekStart}`
        
        let duration = 0;
        if (row.clock_out) {
            duration = (new Date(row.clock_out).getTime() - new Date(row.clock_in).getTime()) / 3600000;
        }

        if (!grouped.has(key)) {
            grouped.set(key, {
                employee_id: row.employee_id,
                employee_name: row.employees?.display_name || 'Unknown',
                week_start: weekStart,
                total_hours: 0
            })
        }
        const group = grouped.get(key)
        group.total_hours += duration
    })

    const results = Array.from(grouped.values()).map(r => ({
        ...r,
        total_hours: Math.round(r.total_hours * 100) / 100
    }))

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
