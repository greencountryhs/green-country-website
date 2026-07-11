import { createClient } from '@/utils/supabase/server';
import {
    getChicagoDateString,
    getPayPeriodClockInBounds,
    getPayPeriodForPayday,
    resolvePaydayParamForSchedule
} from './payPeriod';
import {
    groupByEmployeeSortedDesc,
    resolvePayRateCents,
    resolvePaySchedule,
    type EmployeePayRateRow,
    type EmployeePayScheduleRow
} from './compensation';
import { buildEmployeePayrollSummary } from './buildEmployeePayrollSummary';
import type { CrewPaySummary, PayrollTransactionRecord } from './types';

export async function getCrewPaySummary(
    paydayParam?: string
): Promise<{ data: CrewPaySummary | null; error: string | null }> {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { data: null, error: 'Unauthorized' };
    }

    const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id, display_name, pay_rate_cents')
        .eq('user_id', user.id)
        .eq('active', true)
        .maybeSingle();

    if (empError) {
        return { data: null, error: 'Failed to load your crew profile.' };
    }

    if (!employee) {
        return { data: null, error: 'No crew profile is linked to your account.' };
    }

    const { data: scheduleRows, error: scheduleError } = await supabase
        .from('employee_pay_schedules')
        .select('id, employee_id, period_start_weekday, payday_lag_weeks, effective_from, note, created_at')
        .eq('employee_id', employee.id);

    if (scheduleError) {
        return {
            data: null,
            error:
                'Failed to load your pay schedule.' +
                (scheduleError.message.includes('employee_pay_schedules') ||
                scheduleError.message.includes('payday_lag_weeks')
                    ? ' Ask an admin to apply migrations 022 and 023.'
                    : '')
        };
    }

    const { data: rateRows, error: rateError } = await supabase
        .from('employee_pay_rates')
        .select('id, employee_id, pay_rate_cents, effective_from, note, created_at')
        .eq('employee_id', employee.id);

    if (rateError) {
        return {
            data: null,
            error:
                'Failed to load your pay rate.' +
                (rateError.message.includes('employee_pay_rates')
                    ? ' Ask an admin to apply migration 022.'
                    : '')
        };
    }

    const schedules =
        groupByEmployeeSortedDesc((scheduleRows || []) as EmployeePayScheduleRow[]).get(
            employee.id
        ) || [];
    const rates =
        groupByEmployeeSortedDesc((rateRows || []) as EmployeePayRateRow[]).get(employee.id) ||
        [];

    const today = getChicagoDateString();
    const scheduleHint = resolvePaySchedule(
        schedules,
        paydayParam && /^\d{4}-\d{2}-\d{2}$/.test(paydayParam) ? paydayParam : today
    );

    let payday: string;
    try {
        payday = resolvePaydayParamForSchedule(
            paydayParam,
            scheduleHint.periodStartWeekday,
            scheduleHint.paydayLagWeeks,
            today
        );
    } catch (err) {
        return { data: null, error: err instanceof Error ? err.message : 'Invalid pay period' };
    }

    const schedule = resolvePaySchedule(schedules, payday);

    let period;
    try {
        period = getPayPeriodForPayday(
            payday,
            schedule.periodStartWeekday,
            schedule.paydayLagWeeks
        );
    } catch (err) {
        return { data: null, error: err instanceof Error ? err.message : 'Invalid pay period' };
    }

    const { startUtc, endExclusiveUtc } = getPayPeriodClockInBounds(period);

    const { data: timeEntries, error: teError } = await supabase
        .from('time_entries')
        .select('id, employee_id, clock_in, clock_out, manual_entry, edited_at')
        .eq('employee_id', employee.id)
        .gte('clock_in', startUtc.toISOString())
        .lt('clock_in', endExclusiveUtc.toISOString());

    if (teError) {
        return { data: null, error: 'Failed to load your time entries.' };
    }

    const { data: payrollTransactions, error: txError } = await supabase
        .from('payroll_transactions')
        .select('id, employee_id, transaction_date, entry_type, amount_cents, note')
        .eq('employee_id', employee.id)
        .eq('payday', payday)
        .order('transaction_date', { ascending: true });

    if (txError) {
        return { data: null, error: 'Failed to load your pay adjustments.' };
    }

    const rateCents = resolvePayRateCents(rates, period.periodEnd, employee.pay_rate_cents);

    const employeeSummary = buildEmployeePayrollSummary(
        {
            id: employee.id,
            display_name: employee.display_name,
            pay_rate_cents: rateCents
        },
        timeEntries || [],
        (payrollTransactions || []) as PayrollTransactionRecord[],
        { periodStart: period.periodStart, periodEnd: period.periodEnd }
    );

    return {
        data: {
            payPeriodStart: period.periodStart,
            payPeriodEnd: period.periodEnd,
            payday: period.payday,
            employee: employeeSummary
        },
        error: null
    };
}
