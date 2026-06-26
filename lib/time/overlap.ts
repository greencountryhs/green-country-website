export {
    TIME_ENTRY_OVERLAP_MESSAGE,
    TIME_ENTRY_DUPLICATE_MESSAGE,
    TIME_ENTRY_OPEN_SHIFT_MESSAGE,
    mapTimeEntryDbError,
    resolveTimeEntryFailure
} from './errors';

/**
 * Half-open interval [start, end). `end === null` means an open (still clocked-in) shift.
 */
export function rangesOverlap(
    aStart: Date,
    aEnd: Date | null,
    bStart: Date,
    bEnd: Date | null
): boolean {
    const aEndMs = aEnd ? aEnd.getTime() : Number.POSITIVE_INFINITY;
    const bEndMs = bEnd ? bEnd.getTime() : Number.POSITIVE_INFINITY;
    return aStart.getTime() < bEndMs && bStart.getTime() < aEndMs;
}

export function isExactDuplicate(
    aStart: Date,
    aEnd: Date | null,
    bStart: Date,
    bEnd: Date | null
): boolean {
    const aEndKey = aEnd ? aEnd.getTime() : null;
    const bEndKey = bEnd ? bEnd.getTime() : null;
    return aStart.getTime() === bStart.getTime() && aEndKey === bEndKey;
}

export function parseTimeEntryRange(clockIn: string, clockOut: string | null): { start: Date; end: Date | null } {
    const start = new Date(clockIn);
    if (Number.isNaN(start.getTime())) {
        throw new Error('Invalid clock-in time');
    }
    if (clockOut === null) {
        return { start, end: null };
    }
    const end = new Date(clockOut);
    if (Number.isNaN(end.getTime())) {
        throw new Error('Invalid clock-out time');
    }
    if (end.getTime() <= start.getTime()) {
        throw new Error('Clock-out must be after clock-in');
    }
    return { start, end };
}
