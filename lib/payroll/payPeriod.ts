/** Green Country payroll calendar helpers (America/Chicago).
 * Payday is always Friday.
 * Work window: 7 days from period_start_weekday (end = start + 6).
 * payday_lag_weeks controls which Friday is payday:
 *   0 → first Friday after period end (legacy Fri–Thu ending 9th → pay 10th)
 *   1 → skip that Friday, pay the next (e.g. Thu–Wed ending 8th → pay 17th)
 */

export const PAYROLL_TIME_ZONE = 'America/Chicago';

/** Friday — company payday weekday (fixed). */
export const PAYDAY_WEEKDAY = 5;

/** Legacy default: Friday–Thursday, paid the Friday after period end. */
export const DEFAULT_PERIOD_START_WEEKDAY = 5;
export const DEFAULT_PAYDAY_LAG_WEEKS = 0;

/**
 * New-hire / target schedule: Thursday–Wednesday,
 * paid the Friday of the following week (end 8th → pay 17th).
 */
export const NEW_HIRE_PERIOD_START_WEEKDAY = 4;
export const NEW_HIRE_PAYDAY_LAG_WEEKS = 1;

export const WEEKDAY_LABELS = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
] as const;

export type PayScheduleConfig = {
    periodStartWeekday: number;
    paydayLagWeeks: number;
};

export type PayPeriod = {
    /** Inclusive period start */
    periodStart: string;
    /** Inclusive period end (start + 6 days) */
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

export function isValidPeriodStartWeekday(value: number): boolean {
    return Number.isInteger(value) && value >= 0 && value <= 6;
}

export function isValidPaydayLagWeeks(value: number): boolean {
    return Number.isInteger(value) && value >= 0 && value <= 4;
}

export function periodEndWeekdayFromStart(periodStartWeekday: number): number {
    return (periodStartWeekday + 6) % 7;
}

/** First Friday strictly after dateStr (if dateStr is Friday, returns the next Friday). */
export function firstFridayAfter(dateStr: string): string {
    const dow = getCalendarDayOfWeek(dateStr);
    let daysUntilFri = (PAYDAY_WEEKDAY - dow + 7) % 7;
    if (daysUntilFri === 0) {
        daysUntilFri = 7;
    }
    return addCalendarDays(dateStr, daysUntilFri);
}

export function paydayFromPeriodEnd(periodEnd: string, paydayLagWeeks: number = DEFAULT_PAYDAY_LAG_WEEKS): string {
    if (!isValidPaydayLagWeeks(paydayLagWeeks)) {
        throw new Error(`Invalid payday lag weeks: ${paydayLagWeeks}`);
    }
    return addCalendarDays(firstFridayAfter(periodEnd), paydayLagWeeks * 7);
}

/**
 * Resolve the 7-day work window paid on this Friday for the given schedule.
 * Anchor: firstFridayAfter(periodEnd) === payday − lag weeks.
 */
export function getPayPeriodForPayday(
    paydayFriday: string,
    periodStartWeekday: number = DEFAULT_PERIOD_START_WEEKDAY,
    paydayLagWeeks: number = DEFAULT_PAYDAY_LAG_WEEKS
): PayPeriod {
    if (!DATE_RE.test(paydayFriday)) {
        throw new Error(`Invalid payday: ${paydayFriday}`);
    }
    if (!isValidPeriodStartWeekday(periodStartWeekday)) {
        throw new Error(`Invalid period start weekday: ${periodStartWeekday}`);
    }
    if (!isValidPaydayLagWeeks(paydayLagWeeks)) {
        throw new Error(`Invalid payday lag weeks: ${paydayLagWeeks}`);
    }
    if (getCalendarDayOfWeek(paydayFriday) !== PAYDAY_WEEKDAY) {
        throw new Error(`Payday must be a Friday: ${paydayFriday}`);
    }

    const anchorFriday = addCalendarDays(paydayFriday, -paydayLagWeeks * 7);
    const endWeekday = periodEndWeekdayFromStart(periodStartWeekday);
    let periodEnd: string | null = null;

    for (let daysBefore = 1; daysBefore <= 7; daysBefore++) {
        const candidate = addCalendarDays(anchorFriday, -daysBefore);
        if (getCalendarDayOfWeek(candidate) === endWeekday) {
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

/** Resolve which Friday-paid period contains a work date. */
export function getPayPeriodForWorkDate(
    workDate: string,
    periodStartWeekday: number = DEFAULT_PERIOD_START_WEEKDAY,
    paydayLagWeeks: number = DEFAULT_PAYDAY_LAG_WEEKS
): PayPeriod {
    if (!DATE_RE.test(workDate)) {
        throw new Error(`Invalid work date: ${workDate}`);
    }
    if (!isValidPeriodStartWeekday(periodStartWeekday)) {
        throw new Error(`Invalid period start weekday: ${periodStartWeekday}`);
    }
    if (!isValidPaydayLagWeeks(paydayLagWeeks)) {
        throw new Error(`Invalid payday lag weeks: ${paydayLagWeeks}`);
    }

    const dow = getCalendarDayOfWeek(workDate);
    const daysBack = (dow - periodStartWeekday + 7) % 7;
    const periodStart = addCalendarDays(workDate, -daysBack);
    const periodEnd = addCalendarDays(periodStart, 6);
    const payday = paydayFromPeriodEnd(periodEnd, paydayLagWeeks);

    return { periodStart, periodEnd, payday };
}

/** On payday morning, show the period being paid out today (company default schedule). */
export function getDefaultPaydayForPayrollView(todayChicago = getChicagoDateString()): string {
    if (getCalendarDayOfWeek(todayChicago) === PAYDAY_WEEKDAY) {
        return todayChicago;
    }
    return getPayPeriodForWorkDate(
        todayChicago,
        DEFAULT_PERIOD_START_WEEKDAY,
        DEFAULT_PAYDAY_LAG_WEEKS
    ).payday;
}

/** Snap URL/date params to a Friday payday (company default schedule). */
export function resolvePaydayParam(paydayParam?: string): string {
    if (!paydayParam || !DATE_RE.test(paydayParam)) {
        return getDefaultPaydayForPayrollView();
    }
    if (getCalendarDayOfWeek(paydayParam) === PAYDAY_WEEKDAY) {
        return paydayParam;
    }
    return getPayPeriodForWorkDate(
        paydayParam,
        DEFAULT_PERIOD_START_WEEKDAY,
        DEFAULT_PAYDAY_LAG_WEEKS
    ).payday;
}

/**
 * Default payday for a specific schedule.
 * On Friday → that Friday. Otherwise upcoming payday, preferring a payday
 * still pending for work already completed (gap between period end and pay).
 */
export function getDefaultPaydayForSchedule(
    todayChicago: string,
    periodStartWeekday: number = DEFAULT_PERIOD_START_WEEKDAY,
    paydayLagWeeks: number = DEFAULT_PAYDAY_LAG_WEEKS
): string {
    if (getCalendarDayOfWeek(todayChicago) === PAYDAY_WEEKDAY) {
        return todayChicago;
    }

    const current = getPayPeriodForWorkDate(todayChicago, periodStartWeekday, paydayLagWeeks);
    const previous = getPayPeriodForPayday(
        addCalendarDays(current.payday, -7),
        periodStartWeekday,
        paydayLagWeeks
    );
    if (previous.payday >= todayChicago) {
        return previous.payday;
    }
    return current.payday;
}

export function resolvePaydayParamForSchedule(
    paydayParam: string | undefined,
    periodStartWeekday: number,
    paydayLagWeeks: number,
    todayChicago = getChicagoDateString()
): string {
    if (!paydayParam || !DATE_RE.test(paydayParam)) {
        return getDefaultPaydayForSchedule(todayChicago, periodStartWeekday, paydayLagWeeks);
    }
    if (getCalendarDayOfWeek(paydayParam) === PAYDAY_WEEKDAY) {
        return paydayParam;
    }
    return getPayPeriodForWorkDate(paydayParam, periodStartWeekday, paydayLagWeeks).payday;
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

/** Clock-in filter bounds: [periodStart, day after periodEnd). */
export function getPayPeriodClockInBounds(period: PayPeriod): { startUtc: Date; endExclusiveUtc: Date } {
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

export function formatPaydayLagLabel(paydayLagWeeks: number): string {
    if (paydayLagWeeks === 0) {
        return 'Friday right after period ends';
    }
    if (paydayLagWeeks === 1) {
        return 'Friday of the following week';
    }
    return `Friday, ${paydayLagWeeks} weeks after the first Friday`;
}

/** e.g. "Thursday–Wednesday · paid Friday (following week)" */
export function formatScheduleLabel(
    periodStartWeekday: number,
    paydayLagWeeks: number = DEFAULT_PAYDAY_LAG_WEEKS
): string {
    if (!isValidPeriodStartWeekday(periodStartWeekday)) {
        return 'Invalid schedule';
    }
    const start = WEEKDAY_LABELS[periodStartWeekday];
    const end = WEEKDAY_LABELS[periodEndWeekdayFromStart(periodStartWeekday)];
    const lag =
        paydayLagWeeks === 0
            ? 'paid Friday after period ends'
            : paydayLagWeeks === 1
                ? 'paid Friday the following week'
                : `paid Friday (+${paydayLagWeeks} weeks)`;
    return `${start}–${end} · ${lag}`;
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
