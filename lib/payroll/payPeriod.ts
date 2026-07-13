/** Green Country payroll calendar (America/Chicago).
 * Company-wide: Thursday–Wednesday work periods.
 * Payday is the Friday of the week after the period ends
 * (e.g. period ending Wed the 8th → paid Fri the 17th).
 */

export const PAYROLL_TIME_ZONE = 'America/Chicago';

/** Friday */
export const PAYDAY_WEEKDAY = 5;

/** Thursday — period start */
const PERIOD_START_WEEKDAY = 4;

/** Wednesday — period end (= start + 6) */
const PERIOD_END_WEEKDAY = 3;

/**
 * Weeks after the first Friday following period end.
 * 1 → end Wed 8th, first Friday is 10th, payday is 17th.
 */
const PAYDAY_LAG_WEEKS = 1;

export type PayPeriod = {
    /** Inclusive Thursday */
    periodStart: string;
    /** Inclusive Wednesday */
    periodEnd: string;
    /** Friday payday */
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

/** First Friday strictly after dateStr. */
function firstFridayAfter(dateStr: string): string {
    const dow = getCalendarDayOfWeek(dateStr);
    let daysUntilFri = (PAYDAY_WEEKDAY - dow + 7) % 7;
    if (daysUntilFri === 0) {
        daysUntilFri = 7;
    }
    return addCalendarDays(dateStr, daysUntilFri);
}

function paydayFromPeriodEnd(periodEnd: string): string {
    return addCalendarDays(firstFridayAfter(periodEnd), PAYDAY_LAG_WEEKS * 7);
}

/** Payday must be Friday; pays for the Thu–Wed window tied to that Friday. */
export function getPayPeriodForPayday(paydayFriday: string): PayPeriod {
    if (!DATE_RE.test(paydayFriday)) {
        throw new Error(`Invalid payday: ${paydayFriday}`);
    }
    if (getCalendarDayOfWeek(paydayFriday) !== PAYDAY_WEEKDAY) {
        throw new Error(`Payday must be a Friday: ${paydayFriday}`);
    }

    // Anchor: first Friday after periodEnd = payday − lag weeks
    const anchorFriday = addCalendarDays(paydayFriday, -PAYDAY_LAG_WEEKS * 7);
    let periodEnd: string | null = null;

    for (let daysBefore = 1; daysBefore <= 7; daysBefore++) {
        const candidate = addCalendarDays(anchorFriday, -daysBefore);
        if (getCalendarDayOfWeek(candidate) === PERIOD_END_WEEKDAY) {
            periodEnd = candidate;
            break;
        }
    }

    if (!periodEnd) {
        throw new Error(`Could not resolve period end for payday ${paydayFriday}`);
    }

    const periodStart = addCalendarDays(periodEnd, -6);
    return { periodStart, periodEnd, payday: paydayFriday };
}

/** Resolve which Friday-paid Thu–Wed period contains a work date. */
export function getPayPeriodForWorkDate(workDate: string): PayPeriod {
    if (!DATE_RE.test(workDate)) {
        throw new Error(`Invalid work date: ${workDate}`);
    }

    const dow = getCalendarDayOfWeek(workDate);
    const daysBack = (dow - PERIOD_START_WEEKDAY + 7) % 7;
    const periodStart = addCalendarDays(workDate, -daysBack);
    const periodEnd = addCalendarDays(periodStart, 6);
    const payday = paydayFromPeriodEnd(periodEnd);

    return { periodStart, periodEnd, payday };
}

/**
 * Default payday for payroll views.
 * On Friday → that Friday. Otherwise the next upcoming payday,
 * preferring a payday still pending for a period that already ended.
 */
export function getDefaultPaydayForPayrollView(todayChicago = getChicagoDateString()): string {
    if (getCalendarDayOfWeek(todayChicago) === PAYDAY_WEEKDAY) {
        return todayChicago;
    }

    const current = getPayPeriodForWorkDate(todayChicago);
    const previous = getPayPeriodForPayday(addCalendarDays(current.payday, -7));
    if (previous.payday >= todayChicago) {
        return previous.payday;
    }
    return current.payday;
}

/** Snap URL/date params to a Friday payday. */
export function resolvePaydayParam(paydayParam?: string): string {
    if (!paydayParam || !DATE_RE.test(paydayParam)) {
        return getDefaultPaydayForPayrollView();
    }
    if (getCalendarDayOfWeek(paydayParam) === PAYDAY_WEEKDAY) {
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

/** Clock-in filter: [periodStart, day after periodEnd). */
export function getPayPeriodClockInBounds(period: PayPeriod): {
    startUtc: Date;
    endExclusiveUtc: Date;
} {
    return {
        startUtc: getChicagoDayStartUtc(period.periodStart),
        endExclusiveUtc: getChicagoDayStartUtc(addCalendarDays(period.periodEnd, 1))
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
