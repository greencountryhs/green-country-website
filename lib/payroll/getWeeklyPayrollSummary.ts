import { createClient } from '@/utils/supabase/server';
import { WeeklyPayrollSummary, EmployeePayrollSummary } from './types';

export function getWeekBoundaries(dateString?: string) {
    let d: Date;
    if (dateString && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [y, m, day] = dateString.split('-').map(Number);
        d = new Date(y, m - 1, day);
    } else {
        d = new Date();
    }

    // In JS, 0 is Sunday, 1 is Monday. We treat Monday as start of week.
    const currentDay = d.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    weekEnd.setHours(0, 0, 0, 0);

    const sunday = new Date(weekEnd);
    sunday.setDate(sunday.getDate() - 1);

    return {
        start: weekStart,
        end: weekEnd,
        startString: `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`,
        endString: `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`,
        sundayString: `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`
    };
}

export async function getWeeklyPayrollSummary(weekStartParam?: string): Promise<{ data: WeeklyPayrollSummary | null, error: string | null }> {
    const supabase = await createClient();

    // Verify authentication and role server-side
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { data: null, error: 'Unauthorized' };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'admin') {
        return { data: null, error: 'Unauthorized' };
    }

    const { start, end, startString, endString, sundayString } = getWeekBoundaries(weekStartParam);

    // Fetch active employees
    const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, display_name, hourly_rate')
        .eq('active', true);

    if (empError || !employees) {
        return { data: null, error: 'Failed to fetch employees: ' + empError?.message };
    }

    // Fetch time entries exactly within boundaries
    const { data: timeEntries, error: teError } = await supabase
        .from('time_entries')
        .select('id, employee_id, clock_in, clock_out')
        .gte('clock_in', start.toISOString())
        .lt('clock_in', end.toISOString());

    if (teError) {
        return { data: null, error: 'Failed to fetch time entries: ' + teError.message };
    }

    // Group and aggregate
    const employeeMap = new Map<string, EmployeePayrollSummary>();

    employees.forEach(emp => {
        employeeMap.set(emp.id, {
            employee_id: emp.id,
            display_name: emp.display_name,
            hourly_rate: emp.hourly_rate !== null ? Number(emp.hourly_rate) : null,
            total_hours: 0,
            entry_count: 0,
            open_entry_count: 0,
            estimated_gross_pay: emp.hourly_rate !== null ? 0 : null,
            entries: []
        });
    });

    let overallTotalHours = 0;
    let overallOpenEntries = 0;
    let overallEstimatedPay = 0;
    let employeesWithHoursCount = 0;

    (timeEntries || []).forEach(te => {
        const empSummary = employeeMap.get(te.employee_id);
        if (!empSummary) return; // Skip if employee was missing/inactive

        let durationHours: number | null = null;
        const isOpen = te.clock_out === null;

        if (!isOpen) {
            const ms = new Date(te.clock_out).getTime() - new Date(te.clock_in).getTime();
            durationHours = ms / (1000 * 60 * 60);
            empSummary.total_hours += durationHours;
            overallTotalHours += durationHours;
        }

        empSummary.entry_count += 1;
        if (isOpen) {
            empSummary.open_entry_count += 1;
            overallOpenEntries += 1;
        }

        empSummary.entries.push({
            id: te.id,
            employee_id: te.employee_id,
            clock_in: te.clock_in,
            clock_out: te.clock_out,
            duration_hours: durationHours
        });
    });

    const finalEmployeeSummaries: EmployeePayrollSummary[] = [];

    Array.from(employeeMap.values()).forEach(summary => {
        if (summary.entry_count > 0) {
            employeesWithHoursCount += 1;

            // Calculate pay if rate exists
            if (summary.hourly_rate !== null) {
                summary.estimated_gross_pay = summary.total_hours * summary.hourly_rate;
                overallEstimatedPay += summary.estimated_gross_pay;
            }

            // Order entries by clock_in time
            summary.entries.sort((a, b) => new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime());
            finalEmployeeSummaries.push(summary);
        }
    });

    // Sort employee summaries by name
    finalEmployeeSummaries.sort((a, b) => a.display_name.localeCompare(b.display_name));

    const result: WeeklyPayrollSummary = {
        weekStart: startString,
        weekEndExclusive: endString,
        weekEndInclusive: sundayString,
        totalHours: overallTotalHours,
        employeesWithHours: employeesWithHoursCount,
        openEntries: overallOpenEntries,
        estimatedPayrollTotal: overallEstimatedPay,
        employeeSummaries: finalEmployeeSummaries
    };

    return { data: result, error: null };
}
