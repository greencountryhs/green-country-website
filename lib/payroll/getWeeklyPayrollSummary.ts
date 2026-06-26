import { createClient } from '@/utils/supabase/server';
import {
    addCalendarDays,
    getPayPeriodClockInBounds,
    getPayPeriodForPayday,
    resolvePaydayParam
} from './payPeriod';
import { PayrollPeriodSummary, EmployeePayrollSummary } from './types';

function hourlyRateFromCents(payRateCents: number | null | undefined): number | null {
    if (payRateCents === null || payRateCents === undefined) {
        return null;
    }
    return payRateCents / 100;
}

export async function getWeeklyPayrollSummary(paydayParam?: string): Promise<{ data: PayrollPeriodSummary | null, error: string | null }> {
    const supabase = await createClient();

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

    let payday: string;
    try {
        payday = resolvePaydayParam(paydayParam);
    } catch (err) {
        return { data: null, error: err instanceof Error ? err.message : 'Invalid pay period' };
    }

    const period = getPayPeriodForPayday(payday);
    const { startUtc, endExclusiveUtc } = getPayPeriodClockInBounds(period);

    const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, display_name, pay_rate_cents')
        .eq('active', true);

    if (empError || !employees) {
        return { data: null, error: 'Failed to fetch employees: ' + empError?.message };
    }

    const { data: timeEntries, error: teError } = await supabase
        .from('time_entries')
        .select('id, employee_id, clock_in, clock_out')
        .gte('clock_in', startUtc.toISOString())
        .lt('clock_in', endExclusiveUtc.toISOString());

    if (teError) {
        return { data: null, error: 'Failed to fetch time entries: ' + teError.message };
    }

    const employeeMap = new Map<string, EmployeePayrollSummary>();

    employees.forEach((emp) => {
        const payRateCents = emp.pay_rate_cents ?? null;
        const hourlyRate = hourlyRateFromCents(payRateCents);

        employeeMap.set(emp.id, {
            employee_id: emp.id,
            display_name: emp.display_name,
            hourly_rate: hourlyRate,
            pay_rate_cents: payRateCents,
            total_hours: 0,
            entry_count: 0,
            open_entry_count: 0,
            estimated_gross_pay: hourlyRate !== null ? 0 : null,
            entries: []
        });
    });

    let overallTotalHours = 0;
    let overallOpenEntries = 0;
    let overallEstimatedPay = 0;
    let employeesWithHoursCount = 0;

    (timeEntries || []).forEach((te) => {
        const empSummary = employeeMap.get(te.employee_id);
        if (!empSummary) return;

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

    Array.from(employeeMap.values()).forEach((summary) => {
        if (summary.entry_count > 0) {
            employeesWithHoursCount += 1;

            if (summary.hourly_rate !== null) {
                summary.estimated_gross_pay = summary.total_hours * summary.hourly_rate;
                overallEstimatedPay += summary.estimated_gross_pay;
            }

            summary.entries.sort((a, b) => new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime());
            finalEmployeeSummaries.push(summary);
        }
    });

    finalEmployeeSummaries.sort((a, b) => a.display_name.localeCompare(b.display_name));

    const result: PayrollPeriodSummary = {
        payPeriodStart: period.periodStart,
        payPeriodEnd: period.periodEnd,
        payday: period.payday,
        totalHours: overallTotalHours,
        employeesWithHours: employeesWithHoursCount,
        openEntries: overallOpenEntries,
        estimatedPayrollTotal: overallEstimatedPay,
        employeeSummaries: finalEmployeeSummaries
    };

    return { data: result, error: null };
}

/** Navigate payroll UI by payday (±7 days). */
export function getAdjacentPayday(payday: string, direction: -1 | 1): string {
    return addCalendarDays(payday, direction * 7);
}
