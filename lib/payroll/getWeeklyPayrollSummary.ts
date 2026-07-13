import { createClient } from '@/utils/supabase/server';
import {
    addCalendarDays,
    getPayPeriodClockInBounds,
    getPayPeriodForPayday,
    resolvePaydayParam
} from './payPeriod';
import {
    groupByEmployeeSortedDesc,
    resolvePayRateCents,
    type EmployeePayRateRow
} from './compensation';
import { buildEmployeePayrollSummary } from './buildEmployeePayrollSummary';
import { PayrollPeriodSummary, PayrollTransactionRecord } from './types';

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

    let period;
    try {
        period = getPayPeriodForPayday(payday);
    } catch (err) {
        return { data: null, error: err instanceof Error ? err.message : 'Invalid pay period' };
    }

    const { startUtc, endExclusiveUtc } = getPayPeriodClockInBounds(period);

    const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, display_name, pay_rate_cents')
        .eq('active', true)
        .order('display_name');

    if (empError || !employees) {
        return { data: null, error: 'Failed to fetch employees: ' + empError?.message };
    }

    const employeeIds = employees.map((e) => e.id);
    let rateRows: EmployeePayRateRow[] = [];

    if (employeeIds.length > 0) {
        const { data: rates, error: rateError } = await supabase
            .from('employee_pay_rates')
            .select('id, employee_id, pay_rate_cents, effective_from, note, created_at')
            .in('employee_id', employeeIds);

        if (rateError) {
            return {
                data: null,
                error:
                    'Failed to fetch pay rates: ' +
                    rateError.message +
                    (rateError.message.includes('employee_pay_rates')
                        ? ' Apply migration 022_employee_pay_rates_and_schedules.sql in Supabase.'
                        : '')
            };
        }

        rateRows = (rates || []) as EmployeePayRateRow[];
    }

    const ratesByEmployee = groupByEmployeeSortedDesc(rateRows);

    const { data: timeEntries, error: teError } = await supabase
        .from('time_entries')
        .select('id, employee_id, clock_in, clock_out, manual_entry, edited_at')
        .gte('clock_in', startUtc.toISOString())
        .lt('clock_in', endExclusiveUtc.toISOString());

    if (teError) {
        return { data: null, error: 'Failed to fetch time entries: ' + teError.message };
    }

    const { data: payrollTransactions, error: txError } = await supabase
        .from('payroll_transactions')
        .select('id, employee_id, transaction_date, entry_type, amount_cents, note')
        .eq('payday', payday)
        .order('transaction_date', { ascending: true });

    if (txError) {
        return { data: null, error: 'Failed to fetch payroll transactions: ' + txError.message };
    }

    const transactionsByEmployee = new Map<string, PayrollTransactionRecord[]>();
    for (const row of payrollTransactions || []) {
        const list = transactionsByEmployee.get(row.employee_id) || [];
        list.push(row as PayrollTransactionRecord);
        transactionsByEmployee.set(row.employee_id, list);
    }

    const entriesByEmployee = new Map<string, NonNullable<typeof timeEntries>>();
    for (const row of timeEntries || []) {
        const list = entriesByEmployee.get(row.employee_id) || [];
        list.push(row);
        entriesByEmployee.set(row.employee_id, list);
    }

    let overallTotalHours = 0;
    let overallOpenEntries = 0;
    let overallEstimatedPay = 0;
    let employeesWithHoursCount = 0;
    let totalAdditions = 0;
    let totalDeductions = 0;
    let totalPaidAndAdvanced = 0;
    let totalNetRemainingOwed = 0;

    const finalEmployeeSummaries = employees
        .map((emp) => {
            const rateCents = resolvePayRateCents(
                ratesByEmployee.get(emp.id) || [],
                period.periodEnd,
                emp.pay_rate_cents
            );
            return buildEmployeePayrollSummary(
                { id: emp.id, display_name: emp.display_name, pay_rate_cents: rateCents },
                entriesByEmployee.get(emp.id) || [],
                transactionsByEmployee.get(emp.id) || [],
                { periodStart: period.periodStart, periodEnd: period.periodEnd }
            );
        })
        .filter((summary) => summary.entry_count > 0 || summary.transactions.length > 0);

    for (const summary of finalEmployeeSummaries) {
        overallTotalHours += summary.total_hours;
        overallOpenEntries += summary.open_entry_count;
        if (summary.entry_count > 0) {
            employeesWithHoursCount += 1;
        }
        if (summary.estimated_gross_pay !== null) {
            overallEstimatedPay += summary.estimated_gross_pay;
        }
        totalAdditions += summary.additions;
        totalDeductions += summary.deductions;
        totalPaidAndAdvanced += summary.paid_and_advanced;
        if (summary.net_remaining_owed !== null) {
            totalNetRemainingOwed += summary.net_remaining_owed;
        }
    }

    finalEmployeeSummaries.sort((a, b) => a.display_name.localeCompare(b.display_name));

    const result: PayrollPeriodSummary = {
        payPeriodStart: period.periodStart,
        payPeriodEnd: period.periodEnd,
        payday: period.payday,
        totalHours: overallTotalHours,
        employeesWithHours: employeesWithHoursCount,
        openEntries: overallOpenEntries,
        estimatedPayrollTotal: overallEstimatedPay,
        totalAdditions,
        totalDeductions,
        totalPaidAndAdvanced,
        totalNetRemainingOwed,
        employeeSummaries: finalEmployeeSummaries,
        activeEmployees: employees.map((emp) => ({ id: emp.id, display_name: emp.display_name }))
    };

    return { data: result, error: null };
}

export function getAdjacentPayday(payday: string, direction: -1 | 1): string {
    return addCalendarDays(payday, direction * 7);
}
