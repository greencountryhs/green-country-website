import { getChicagoDateString } from './payPeriod';

export type EmployeePayRateRow = {
    employee_id: string;
    pay_rate_cents: number;
    effective_from: string;
    note?: string | null;
    created_at?: string;
    id?: string;
};

/** Latest row with effective_from <= asOfDate (rows must be sorted desc by effective_from). */
export function resolveEffectiveRow<T extends { effective_from: string }>(
    rows: T[],
    asOfDate: string
): T | null {
    for (const row of rows) {
        if (row.effective_from <= asOfDate) {
            return row;
        }
    }
    return null;
}

export function resolvePayRateCents(
    rows: EmployeePayRateRow[],
    asOfDate: string,
    fallbackCents: number | null = null
): number | null {
    const row = resolveEffectiveRow(rows, asOfDate);
    if (row) {
        return row.pay_rate_cents;
    }
    return fallbackCents;
}

/** Group history rows by employee_id, each list sorted effective_from DESC. */
export function groupByEmployeeSortedDesc<T extends { employee_id: string; effective_from: string }>(
    rows: T[]
): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const row of rows) {
        const list = map.get(row.employee_id) || [];
        list.push(row);
        map.set(row.employee_id, list);
    }
    for (const [, list] of Array.from(map.entries())) {
        list.sort((a, b) => b.effective_from.localeCompare(a.effective_from));
    }
    return map;
}

export function todayChicagoDate(): string {
    return getChicagoDateString();
}
