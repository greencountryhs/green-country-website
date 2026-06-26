import { createClient } from '@/utils/supabase/server';
import {
    addCalendarDays,
    getPayPeriodClockInBounds,
    getPayPeriodForPayday,
    resolvePaydayParam
} from './payPeriod';
import { computePayrollFinancials } from './transactionTypes';
import { PayrollPeriodSummary, EmployeePayrollSummary, PayrollTransactionRecord } from './types';

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
        .eq('active', true)
        .order('display_name');

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

    const employeeMap = new Map<string, EmployeePayrollSummary>();

    employees.forEach((emp) => {
        const payRateCents = emp.pay_rate_cents ?? null;
        const hourlyRate = hourlyRateFromCents(payRateCents);
        const transactions = transactionsByEmployee.get(emp.id) || [];
        const financials = computePayrollFinancials(null, transactions);

        employeeMap.set(emp.id, {
            employee_id: emp.id,
            display_name: emp.display_name,
            hourly_rate: hourlyRate,
            pay_rate_cents: payRateCents,
            total_hours: 0,
            entry_count: 0,
            open_entry_count: 0,
            estimated_gross_pay: hourlyRate !== null ? 0 : null,
            additions: financials.additions,
            deductions: financials.deductions,
            paid_and_advanced: financials.paid_and_advanced,
            net_remaining_owed: financials.net_remaining_owed,
            entries: [],
            transactions
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
        const hasHours = summary.entry_count > 0;
        const hasTransactions = summary.transactions.length > 0;

        if (!hasHours && !hasTransactions) {
            return;
        }

        if (hasHours) {
            employeesWithHoursCount += 1;
            if (summary.hourly_rate !== null) {
                summary.estimated_gross_pay = summary.total_hours * summary.hourly_rate;
                overallEstimatedPay += summary.estimated_gross_pay;
            }
            summary.entries.sort((a, b) => new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime());
        }

        const financials = computePayrollFinancials(summary.estimated_gross_pay, summary.transactions);
        summary.additions = financials.additions;
        summary.deductions = financials.deductions;
        summary.paid_and_advanced = financials.paid_and_advanced;
        summary.net_remaining_owed = financials.net_remaining_owed;

        finalEmployeeSummaries.push(summary);
    });

    finalEmployeeSummaries.sort((a, b) => a.display_name.localeCompare(b.display_name));

    let totalAdditions = 0;
    let totalDeductions = 0;
    let totalPaidAndAdvanced = 0;
    let totalNetRemainingOwed = 0;

    finalEmployeeSummaries.forEach((summary) => {
        totalAdditions += summary.additions;
        totalDeductions += summary.deductions;
        totalPaidAndAdvanced += summary.paid_and_advanced;
        if (summary.net_remaining_owed !== null) {
            totalNetRemainingOwed += summary.net_remaining_owed;
        }
    });

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
