import { computePayrollFinancials } from './transactionTypes';
import type { EmployeePayrollSummary, PayrollTimeEntry, PayrollTransactionRecord } from './types';

export function hourlyRateFromCents(payRateCents: number | null | undefined): number | null {
    if (payRateCents === null || payRateCents === undefined) {
        return null;
    }
    return payRateCents / 100;
}

type TimeEntryRow = {
    id: string;
    employee_id: string;
    clock_in: string;
    clock_out: string | null;
    manual_entry?: boolean | null;
    edited_at?: string | null;
};

export function buildEmployeePayrollSummary(
    employee: {
        id: string;
        display_name: string;
        pay_rate_cents: number | null;
    },
    timeEntries: TimeEntryRow[],
    transactions: PayrollTransactionRecord[]
): EmployeePayrollSummary {
    const payRateCents = employee.pay_rate_cents ?? null;
    const hourlyRate = hourlyRateFromCents(payRateCents);

    let totalHours = 0;
    let entryCount = 0;
    let openEntryCount = 0;
    const entries: PayrollTimeEntry[] = [];

    for (const te of timeEntries) {
        let durationHours: number | null = null;
        const isOpen = te.clock_out === null;

        if (!isOpen) {
            const ms = new Date(te.clock_out).getTime() - new Date(te.clock_in).getTime();
            durationHours = ms / (1000 * 60 * 60);
            totalHours += durationHours;
        }

        entryCount += 1;
        if (isOpen) {
            openEntryCount += 1;
        }

        entries.push({
            id: te.id,
            employee_id: te.employee_id,
            clock_in: te.clock_in,
            clock_out: te.clock_out,
            duration_hours: durationHours,
            manual_entry: !!te.manual_entry,
            was_edited: te.edited_at != null
        });
    }

    entries.sort((a, b) => new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime());

    const estimatedGrossPay =
        hourlyRate !== null
            ? entryCount > 0
                ? totalHours * hourlyRate
                : 0
            : null;

    const hasPayrollActivity = entryCount > 0 || transactions.length > 0;
    const financials = computePayrollFinancials(
        hasPayrollActivity ? estimatedGrossPay : null,
        transactions
    );

    return {
        employee_id: employee.id,
        display_name: employee.display_name,
        hourly_rate: hourlyRate,
        pay_rate_cents: payRateCents,
        total_hours: totalHours,
        entry_count: entryCount,
        open_entry_count: openEntryCount,
        estimated_gross_pay: hasPayrollActivity ? estimatedGrossPay : null,
        additions: financials.additions,
        deductions: financials.deductions,
        paid_and_advanced: financials.paid_and_advanced,
        net_remaining_owed: financials.net_remaining_owed,
        entries,
        transactions
    };
}
