export const TIME_ENTRY_OVERLAP_MESSAGE =
    'This time entry overlaps an existing entry for this employee.';

export const TIME_ENTRY_DUPLICATE_MESSAGE =
    'This time entry duplicates an existing entry for this employee.';

export const TIME_ENTRY_OPEN_SHIFT_MESSAGE =
    'This employee already has an open clock-in.';

export type TimeEntryResult<T = void> =
    | { ok: true; data: T }
    | { ok: false; error: string };

export function timeEntrySuccess(): { ok: true; data: void };
export function timeEntrySuccess<T>(data: T): { ok: true; data: T };
export function timeEntrySuccess<T>(data?: T) {
    return { ok: true as const, data: data as T };
}

export function timeEntryFailure(error: string): { ok: false; error: string } {
    return { ok: false as const, error };
}

const KNOWN_TIME_ENTRY_MESSAGES = new Set([
    TIME_ENTRY_OVERLAP_MESSAGE,
    TIME_ENTRY_DUPLICATE_MESSAGE,
    TIME_ENTRY_OPEN_SHIFT_MESSAGE
]);

export function isKnownTimeEntryMessage(message: string): boolean {
    return KNOWN_TIME_ENTRY_MESSAGES.has(message);
}

type DbErrorLike = {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
};

function constraintFromMessage(message: string): string | null {
    const match = message.match(/constraint "([^"]+)"/i);
    return match?.[1] ?? null;
}

/** Map Postgres / Supabase constraint errors to user-facing copy. */
export function mapTimeEntryDbError(error: DbErrorLike): string | null {
    const message = error.message ?? '';
    const constraint = constraintFromMessage(message);

    if (constraint === 'time_entries_no_overlap' || error.code === '23P01') {
        return TIME_ENTRY_OVERLAP_MESSAGE;
    }

    if (constraint === 'time_entries_one_open_shift_per_employee') {
        return TIME_ENTRY_OPEN_SHIFT_MESSAGE;
    }

    if (error.code === '23505' && message.includes('time_entries_one_open_shift_per_employee')) {
        return TIME_ENTRY_OPEN_SHIFT_MESSAGE;
    }

    if (error.code === '42501') {
        return 'You do not have permission to modify time entries.';
    }

    if (error.code === '23503') {
        return 'Unable to save time entry: invalid employee or user account.';
    }

    if (error.code === '23514' && constraint === 'time_entries_no_overlap') {
        return TIME_ENTRY_OVERLAP_MESSAGE;
    }

    return null;
}

export function resolveTimeEntryFailure(
    error: DbErrorLike,
    fallback = 'Failed to save time entry'
): string {
    return mapTimeEntryDbError(error) ?? fallback;
}
