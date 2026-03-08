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
    hourly_rate: number | null;
    total_hours: number;
    entry_count: number;
    open_entry_count: number;
    estimated_gross_pay: number | null;
    entries: PayrollTimeEntry[];
};

export type WeeklyPayrollSummary = {
    weekStart: string; // YYYY-MM-DD
    weekEndExclusive: string; // YYYY-MM-DD
    weekEndInclusive: string; // YYYY-MM-DD (Sunday)
    totalHours: number;
    employeesWithHours: number;
    openEntries: number;
    estimatedPayrollTotal: number;
    employeeSummaries: EmployeePayrollSummary[];
};
