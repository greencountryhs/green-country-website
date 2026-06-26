'use server'

import { correctTimeEntry, createManualTimeEntry, deleteTimeEntry } from '@/lib/reports'
import { revalidatePath } from 'next/cache'

export type ReportFormState = {
    error: string | null
    success: boolean
}

export const initialReportFormState: ReportFormState = { error: null, success: false }

const errorBannerStyle = {
    background: '#fef2f2',
    color: '#991b1b',
    borderColor: '#fecaca',
    marginBottom: '0.75rem'
} as const

// Parse a datetime-local string (YYYY-MM-DDThh:mm) originating from the America/Chicago 
// timezone into an exact UTC ISO string without relying on the Node.js server's timezone env.
function parseLocalTime(localStr: string | null): { iso: string } | { error: string } {
    if (!localStr) return { error: 'A date and time is required.' };
    
    const [datePart, timePart] = localStr.split('T');
    const [y, m, d] = datePart.split('-').map(Number);
    const [h, min] = timePart.split(':').map(Number);

    // Guess the UTC time is local time + 6 hours (worst case offset, CST)
    const guessUtc = new Date(Date.UTC(y, m - 1, d, h + 6, min));
    
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', hour12: false
    });
    
    const parts = formatter.formatToParts(guessUtc);
    const chicY = parseInt(parts.find(p => p.type === 'year')!.value, 10);
    const chicM = parseInt(parts.find(p => p.type === 'month')!.value, 10);
    const chicD = parseInt(parts.find(p => p.type === 'day')!.value, 10);
    let chicH = parseInt(parts.find(p => p.type === 'hour')!.value, 10);
    const chicMin = parseInt(parts.find(p => p.type === 'minute')!.value, 10);
    
    if (chicH === 24) chicH = 0; // Handle midnight

    // Treat formatted output as absolute numbers for the difference check
    const chicAbs = Date.UTC(chicY, chicM - 1, chicD, chicH, chicMin);
    const targetAbs = Date.UTC(y, m - 1, d, h, min);
    
    // Difference fixes DST or CST/CDT shifts
    const diffMs = targetAbs - chicAbs;
    const resultIso =  new Date(guessUtc.getTime() + diffMs).toISOString();

    // Protection against ambiguous/non-existent times during Spring Forward jumps
    const verifyParts = formatter.formatToParts(new Date(resultIso));
    let verifyH = parseInt(verifyParts.find(p => p.type === 'hour')!.value, 10);
    if (verifyH === 24) verifyH = 0;
    const verifyMin = parseInt(verifyParts.find(p => p.type === 'minute')!.value, 10);

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
        if (result.ok === false) {
            return { error: result.error, success: false }
        }

        revalidatePath('/dashboard/reports')
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
        const employeeId = formData.get('employeeId') as string
        const clockIn = formData.get('clockIn') as string
        const clockOut = formData.get('clockOut') as string
        const reason = formData.get('reason') as string

        if (!employeeId || !clockIn || !clockOut || !reason) {
            return { error: 'Missing required fields', success: false }
        }

        const parsedIn = parseLocalTime(clockIn)
        if ('error' in parsedIn) {
            return { error: parsedIn.error, success: false }
        }

        const parsedOut = parseLocalTime(clockOut)
        if ('error' in parsedOut) {
            return { error: parsedOut.error, success: false }
        }

        const result = await createManualTimeEntry(employeeId, parsedIn.iso, parsedOut.iso, reason)
        if (result.ok === false) {
            return { error: result.error, success: false }
        }

        revalidatePath('/dashboard/reports')
        return { error: null, success: true }
    } catch (err) {
        console.error('createManualTimeEntryAction unexpected error:', err)
        return { error: 'An unexpected error occurred while creating the entry.', success: false }
    }
}

export async function deleteTimeEntryAction(formData: FormData) {
    const entryId = formData.get('entryId') as string
    const reason = formData.get('reason') as string

    if (!entryId) throw new Error("Missing entryId")

    await deleteTimeEntry(entryId, reason)
    revalidatePath('/dashboard/reports')
}

export { errorBannerStyle }
