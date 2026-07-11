import type { PayrollEntryType } from './transactionTypes';

export type PayrollTimeEntry = {
    id: string;
    employee_id: string;
    clock_in: string;
    clock_out: string | null;
    duration_hours: number | null;
    manual_entry?: boolean;
    was_edited?: boolean;
};

export type PayrollTransactionRecord = {
    id: string;
    employee_id: string;
    transaction_date: string;
    entry_type: PayrollEntryType;
    amount_cents: number;
    note: string | null;
};

export type EmployeePayrollSummary = {
    employee_id: string;
    display_name: string;
    hourly_rate: number | null;
    pay_rate_cents: number | null;
    /** Employee-specific work window for this payday (may differ during schedule taper). */
    pay_period_start: string;
    pay_period_end: string;
    total_hours: number;
    entry_count: number;
    open_entry_count: number;
    estimated_gross_pay: number | null;
    additions: number;
    deductions: number;
    paid_and_advanced: number;
    net_remaining_owed: number | null;
    entries: PayrollTimeEntry[];
    transactions: PayrollTransactionRecord[];
};

export type PayrollPeriodSummary = {
    payPeriodStart: string;
    payPeriodEnd: string;
    payday: string;
    totalHours: number;
    employeesWithHours: number;
    openEntries: number;
    estimatedPayrollTotal: number;
    totalAdditions: number;
    totalDeductions: number;
    totalPaidAndAdvanced: number;
    totalNetRemainingOwed: number;
    employeeSummaries: EmployeePayrollSummary[];
    activeEmployees: Array<{ id: string; display_name: string }>;
};

export type CrewPaySummary = {
    payPeriodStart: string;
    payPeriodEnd: string;
    payday: string;
    employee: EmployeePayrollSummary;
};

/** @deprecated Use PayrollPeriodSummary */
export type WeeklyPayrollSummary = PayrollPeriodSummary;
