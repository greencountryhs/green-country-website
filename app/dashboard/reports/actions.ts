'use server'

import { correctTimeEntry, createManualTimeEntry, deleteTimeEntry } from '@/lib/reports'
import type { ReportFormState } from './formState'

const LOG = '[reports-manual-entry]'

function logStage(stage: string, detail?: Record<string, unknown>) {
    if (detail) {
        console.error(LOG, stage, detail)
    } else {
        console.error(LOG, stage)
    }
}

// Parse a datetime-local string (YYYY-MM-DDThh:mm) originating from the America/Chicago
// timezone into an exact UTC ISO string without relying on the Node.js server's timezone env.
function parseLocalTime(localStr: string | null): { iso: string } | { error: string } {
    if (!localStr || !localStr.trim()) return { error: 'A date and time is required.' };

    const [datePart, timePart] = localStr.split('T');
    if (!datePart || !timePart) {
        return { error: 'Invalid date/time format. Use the date and time picker.' };
    }

    const dateBits = datePart.split('-').map(Number);
    const timeBits = timePart.split(':').map(Number);
    if (dateBits.length < 3 || timeBits.length < 2) {
        return { error: 'Invalid date/time format.' };
    }

    const [y, m, d] = dateBits;
    const [h, min] = timeBits;
    if ([y, m, d, h, min].some((n) => Number.isNaN(n))) {
        return { error: 'Invalid date/time values.' };
    }

    const guessUtc = new Date(Date.UTC(y, m - 1, d, h + 6, min));
    if (Number.isNaN(guessUtc.getTime())) {
        return { error: 'Invalid date/time values.' };
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', hour12: false
    });

    const parts = formatter.formatToParts(guessUtc);
    const yearPart = parts.find(p => p.type === 'year');
    const monthPart = parts.find(p => p.type === 'month');
    const dayPart = parts.find(p => p.type === 'day');
    const hourPart = parts.find(p => p.type === 'hour');
    const minutePart = parts.find(p => p.type === 'minute');
    if (!yearPart || !monthPart || !dayPart || !hourPart || !minutePart) {
        return { error: 'Unable to parse local time.' };
    }

    const chicY = parseInt(yearPart.value, 10);
    const chicM = parseInt(monthPart.value, 10);
    const chicD = parseInt(dayPart.value, 10);
    let chicH = parseInt(hourPart.value, 10);
    const chicMin = parseInt(minutePart.value, 10);

    if (chicH === 24) chicH = 0;

    const chicAbs = Date.UTC(chicY, chicM - 1, chicD, chicH, chicMin);
    const targetAbs = Date.UTC(y, m - 1, d, h, min);

    const diffMs = targetAbs - chicAbs;
    const resultIso = new Date(guessUtc.getTime() + diffMs).toISOString();

    const verifyParts = formatter.formatToParts(new Date(resultIso));
    const verifyHourPart = verifyParts.find(p => p.type === 'hour');
    const verifyMinutePart = verifyParts.find(p => p.type === 'minute');
    if (!verifyHourPart || !verifyMinutePart) {
        return { error: 'Unable to verify local time.' };
    }
    let verifyH = parseInt(verifyHourPart.value, 10);
    if (verifyH === 24) verifyH = 0;
    const verifyMin = parseInt(verifyMinutePart.value, 10);

    const targetH = h === 24 ? 0 : h;
    if (verifyH !== targetH || verifyMin !== min) {
        return { error: `Invalid local time: The time ${localStr} does not exist in the America/Chicago timezone due to daylight savings transitions.` };
    }

    return { iso: resultIso };
}

export async function correctTimeEntryAction(
    _prevState: ReportFormState,
    formData: FormData
): Promise<ReportFormState> {
    try {
        const entryId = formData.get('entryId') as string
        const clockIn = formData.get('clockIn') as string
        const clockOut = formData.get('clockOut') as string
        const reason = formData.get('reason') as string

        if (!entryId || !clockIn || !reason) {
            return { error: 'Missing required fields', success: false }
        }

        const parsedIn = parseLocalTime(clockIn)
        if ('error' in parsedIn) {
            return { error: parsedIn.error, success: false }
        }

        const parsedOut = clockOut ? parseLocalTime(clockOut) : { iso: null as string | null }
        if ('error' in parsedOut) {
            return { error: parsedOut.error, success: false }
        }

        const result = await correctTimeEntry(entryId, parsedIn.iso, parsedOut.iso, reason)
        if (!result || result.ok === false) {
            const message = result && result.ok === false ? result.error : 'Failed to update time entry.'
            return { error: message, success: false }
        }

        return { error: null, success: true }
    } catch (err) {
        console.error('correctTimeEntryAction unexpected error:', err)
        return { error: 'An unexpected error occurred while saving the edit.', success: false }
    }
}

export async function createManualTimeEntryAction(
    _prevState: ReportFormState,
    formData: FormData
): Promise<ReportFormState> {
    try {
        logStage('action-started')

        const employeeId = formData.get('employeeId') as string
        const clockIn = formData.get('clockIn') as string
        const clockOut = formData.get('clockOut') as string
        const reason = formData.get('reason') as string

        logStage('form-parsed', {
            hasEmployeeId: !!employeeId,
            hasClockIn: !!clockIn,
            hasClockOut: !!clockOut,
            hasReason: !!reason
        })

        if (!employeeId || !clockIn || !clockOut || !reason) {
            return { error: 'Missing required fields', success: false }
        }

        const parsedIn = parseLocalTime(clockIn)
        if ('error' in parsedIn) {
            logStage('clock-in-parse-failed', { error: parsedIn.error })
            return { error: parsedIn.error, success: false }
        }

        const parsedOut = parseLocalTime(clockOut)
        if ('error' in parsedOut) {
            logStage('clock-out-parse-failed', { error: parsedOut.error })
            return { error: parsedOut.error, success: false }
        }

        logStage('times-parsed', { clockIn: parsedIn.iso, clockOut: parsedOut.iso })

        if (new Date(parsedOut.iso).getTime() <= new Date(parsedIn.iso).getTime()) {
            return { error: 'Clock-out must be after clock-in.', success: false }
        }

        logStage('createManualTimeEntry-calling', { employeeId })
        const result = await createManualTimeEntry(employeeId, parsedIn.iso, parsedOut.iso, reason)
        logStage('createManualTimeEntry-returned', {
            ok: result?.ok ?? null,
            error: result && result.ok === false ? result.error : null
        })

        if (!result || result.ok === false) {
            const message = result && result.ok === false ? result.error : 'Failed to create time entry.'
            return { error: message, success: false }
        }

        logStage('action-returning-success')
        return { error: null, success: true }
    } catch (err) {
        logStage('action-unexpected-error', {
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined
        })
        return { error: 'An unexpected error occurred while creating the entry. (ref: MTE-UNEXPECTED)', success: false }
    }
}

export async function deleteTimeEntryAction(formData: FormData) {
    try {
        const entryId = formData.get('entryId') as string
        const reason = formData.get('reason') as string

        if (!entryId) {
            console.error('[reports-delete-entry] missing entryId')
            return
        }

        const result = await deleteTimeEntry(entryId, reason)
        if (result?.error) {
            console.error('[reports-delete-entry] failed:', result.error)
        }
    } catch (err) {
        console.error('[reports-delete-entry] unexpected error:', err)
    }
}
