export type PayrollTimeEntry = {
    id: string;
    employee_id: string;
    clock_in: string; // ISO string
    clock_out: string | null; // ISO string
    duration_hours: number | null; // Null if open
};

export type EmployeePayrollSummary = {
    employee_id: string;
    display_name: string;
    /** Derived from employees.pay_rate_cents / 100 */
    hourly_rate: number | null;
    pay_rate_cents: number | null;
    total_hours: number;
    entry_count: number;
    open_entry_count: number;
    estimated_gross_pay: number | null;
    entries: PayrollTimeEntry[];
};

export type PayrollPeriodSummary = {
    /** Friday (inclusive), America/Chicago calendar */
    payPeriodStart: string;
    /** Thursday (inclusive) */
    payPeriodEnd: string;
    /** Friday after payPeriodEnd */
    payday: string;
    totalHours: number;
    employeesWithHours: number;
    openEntries: number;
    estimatedPayrollTotal: number;
    employeeSummaries: EmployeePayrollSummary[];
};

/** @deprecated Use PayrollPeriodSummary */
export type WeeklyPayrollSummary = PayrollPeriodSummary;
