export const PAYROLL_ENTRY_TYPES = [
    'payment',
    'advance',
    'daily_pay',
    'reimbursement',
    'bonus',
    'deduction',
    'other'
] as const;

export type PayrollEntryType = (typeof PAYROLL_ENTRY_TYPES)[number];

export const PAYROLL_ENTRY_TYPE_LABELS: Record<PayrollEntryType, string> = {
    payment: 'Payment',
    advance: 'Advance',
    daily_pay: 'Daily pay',
    reimbursement: 'Reimbursement',
    bonus: 'Bonus',
    deduction: 'Deduction',
    other: 'Other adjustment'
};

/** Types that increase amount owed to the employee. */
export const PAYROLL_ADDITION_TYPES: PayrollEntryType[] = ['reimbursement', 'bonus', 'other'];

/** Types that reduce amount owed before payout. */
export const PAYROLL_DEDUCTION_TYPES: PayrollEntryType[] = ['deduction'];

/** Money already paid or advanced (reduces remaining owed). */
export const PAYROLL_PAYOUT_TYPES: PayrollEntryType[] = ['payment', 'advance', 'daily_pay'];

export type PayrollFinancialBreakdown = {
    gross_labor: number | null;
    additions: number;
    deductions: number;
    paid_and_advanced: number;
    net_remaining_owed: number | null;
};

export function computePayrollFinancials(
    grossLabor: number | null,
    transactions: Array<{ entry_type: PayrollEntryType; amount_cents: number }>
): PayrollFinancialBreakdown {
    let additions = 0;
    let deductions = 0;
    let paidAndAdvanced = 0;

    for (const row of transactions) {
        const dollars = row.amount_cents / 100;
        if (PAYROLL_ADDITION_TYPES.includes(row.entry_type)) {
            additions += dollars;
        } else if (PAYROLL_DEDUCTION_TYPES.includes(row.entry_type)) {
            deductions += dollars;
        } else if (PAYROLL_PAYOUT_TYPES.includes(row.entry_type)) {
            paidAndAdvanced += dollars;
        }
    }

    const hasLabor = grossLabor !== null;
    const hasMoneyActivity = transactions.length > 0;

    if (!hasLabor && !hasMoneyActivity) {
        return {
            gross_labor: null,
            additions: 0,
            deductions: 0,
            paid_and_advanced: 0,
            net_remaining_owed: null
        };
    }

    const gross = grossLabor ?? 0;
    return {
        gross_labor: grossLabor,
        additions,
        deductions,
        paid_and_advanced: paidAndAdvanced,
        net_remaining_owed: gross + additions - deductions - paidAndAdvanced
    };
}

export function parseAmountToCents(amountInput: string | number): number {
    const value = typeof amountInput === 'number' ? amountInput : Number.parseFloat(amountInput);
    if (!Number.isFinite(value) || value <= 0) {
        throw new Error('Amount must be greater than zero');
    }
    return Math.round(value * 100);
}

export function isPayrollEntryType(value: string): value is PayrollEntryType {
    return (PAYROLL_ENTRY_TYPES as readonly string[]).includes(value);
}
