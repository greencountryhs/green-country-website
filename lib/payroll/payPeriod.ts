/** Green Country payroll calendar: Fri–Thu work periods, paid on the following Friday (America/Chicago). */

export const PAYROLL_TIME_ZONE = 'America/Chicago';

export type PayPeriod = {
    /** Friday (inclusive) */
    periodStart: string;
    /** Thursday (inclusive) */
    periodEnd: string;
    /** Friday after periodEnd */
    payday: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function getChicagoDateString(instant: Date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: PAYROLL_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(instant);
}

export function addCalendarDays(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + days);
    return formatUtcCalendarDate(dt);
}

function formatUtcCalendarDate(dt: Date): string {
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

export function getCalendarDayOfWeek(dateStr: string): number {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function daysBackToPeriodFriday(dayOfWeek: number): number {
    return (dayOfWeek + 2) % 7;
}

/** Work on payday Friday belongs to the period that starts that day (paid next Friday). */
export function getPayPeriodForWorkDate(workDate: string): PayPeriod {
    if (!DATE_RE.test(workDate)) {
        throw new Error(`Invalid work date: ${workDate}`);
    }

    const periodStart = addCalendarDays(workDate, -daysBackToPeriodFriday(getCalendarDayOfWeek(workDate)));
    const periodEnd = addCalendarDays(periodStart, 6);
    const payday = addCalendarDays(periodStart, 7);

    return { periodStart, periodEnd, payday };
}

/** Payday must be a Friday; pays for the previous Fri–Thu window. */
export function getPayPeriodForPayday(paydayFriday: string): PayPeriod {
    if (!DATE_RE.test(paydayFriday)) {
        throw new Error(`Invalid payday: ${paydayFriday}`);
    }
    if (getCalendarDayOfWeek(paydayFriday) !== 5) {
        throw new Error(`Payday must be a Friday: ${paydayFriday}`);
    }

    const periodEnd = addCalendarDays(paydayFriday, -1);
    const periodStart = addCalendarDays(paydayFriday, -7);

    return { periodStart, periodEnd, payday: paydayFriday };
}

/** On payday morning, show the period being paid out today (not the new period starting today). */
export function getDefaultPaydayForPayrollView(todayChicago = getChicagoDateString()): string {
    if (getCalendarDayOfWeek(todayChicago) === 5) {
        return todayChicago;
    }
    return getPayPeriodForWorkDate(todayChicago).payday;
}

export function resolvePaydayParam(paydayParam?: string): string {
    if (!paydayParam || !DATE_RE.test(paydayParam)) {
        return getDefaultPaydayForPayrollView();
    }
    if (getCalendarDayOfWeek(paydayParam) === 5) {
        return paydayParam;
    }
    return getPayPeriodForWorkDate(paydayParam).payday;
}

/** Instant of local midnight at the start of a Chicago calendar day. */
export function getChicagoDayStartUtc(dateStr: string): Date {
    if (!DATE_RE.test(dateStr)) {
        throw new Error(`Invalid date: ${dateStr}`);
    }

    const [y, m, d] = dateStr.split('-').map(Number);
    const baseUtc = Date.UTC(y, m - 1, d);

    for (let offsetHours = -14; offsetHours <= 14; offsetHours++) {
        const candidate = new Date(baseUtc + offsetHours * 60 * 60 * 1000);
        if (getChicagoDateString(candidate) !== dateStr) continue;

        const hour = Number(
            new Intl.DateTimeFormat('en-US', {
                timeZone: PAYROLL_TIME_ZONE,
                hour: 'numeric',
                hour12: false
            }).format(candidate)
        );

        if (hour === 0) {
            return candidate;
        }
    }

    throw new Error(`Could not resolve Chicago midnight for ${dateStr}`);
}

/** Exclusive upper bound for clock_in filtering (payday Friday 00:00 Chicago). */
export function getPayPeriodClockInBounds(period: PayPeriod): { startUtc: Date; endExclusiveUtc: Date } {
    return {
        startUtc: getChicagoDayStartUtc(period.periodStart),
        endExclusiveUtc: getChicagoDayStartUtc(period.payday)
    };
}

export function formatPayPeriodLabel(periodStart: string, periodEnd: string): string {
    const start = parseChicagoLabelDate(periodStart);
    const end = parseChicagoLabelDate(periodEnd);
    const sameYear = start.year === end.year;

    if (sameYear) {
        return `${start.month} ${start.day}–${end.month} ${end.day}, ${end.year}`;
    }

    return `${start.month} ${start.day}, ${start.year}–${end.month} ${end.day}, ${end.year}`;
}

export function formatPaydayLabel(payday: string): string {
    const d = parseChicagoLabelDate(payday);
    return `${d.month} ${d.day}, ${d.year}`;
}

function parseChicagoLabelDate(dateStr: string): { month: string; day: string; year: string } {
    const noon = new Date(`${dateStr}T12:00:00Z`);
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: PAYROLL_TIME_ZONE,
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).formatToParts(noon);

    return {
        month: parts.find((p) => p.type === 'month')?.value || '',
        day: parts.find((p) => p.type === 'day')?.value || '',
        year: parts.find((p) => p.type === 'year')?.value || ''
    };
}
