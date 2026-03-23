'use server'

import { correctTimeEntry, createManualTimeEntry, deleteTimeEntry } from '@/lib/reports'
import { revalidatePath } from 'next/cache'

// Parse a datetime-local string (YYYY-MM-DDThh:mm) originating from the America/Chicago 
// timezone into an exact UTC ISO string without relying on the Node.js server's timezone env.
function parseLocalTime(localStr: string | null) {
    if (!localStr) return null;
    
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
        throw new Error(`Invalid local time: The time ${localStr} does not exist in the America/Chicago timezone due to daylight savings transitions.`);
    }

    return resultIso;
}

export async function correctTimeEntryAction(formData: FormData) {
    const entryId = formData.get('entryId') as string
    const clockIn = formData.get('clockIn') as string
    const clockOut = formData.get('clockOut') as string
    const reason = formData.get('reason') as string

    if (!entryId || !clockIn || !reason) throw new Error("Missing required fields")

    await correctTimeEntry(entryId, parseLocalTime(clockIn)!, parseLocalTime(clockOut), reason)
    revalidatePath('/dashboard/reports')
}

export async function createManualTimeEntryAction(formData: FormData) {
    const employeeId = formData.get('employeeId') as string
    const clockIn = formData.get('clockIn') as string
    const clockOut = formData.get('clockOut') as string
    const reason = formData.get('reason') as string

    if (!employeeId || !clockIn || !clockOut || !reason) throw new Error("Missing required fields")

    await createManualTimeEntry(employeeId, parseLocalTime(clockIn)!, parseLocalTime(clockOut)!, reason)
    revalidatePath('/dashboard/reports')
}

export async function deleteTimeEntryAction(formData: FormData) {
    const entryId = formData.get('entryId') as string
    const reason = formData.get('reason') as string

    if (!entryId) throw new Error("Missing entryId")

    await deleteTimeEntry(entryId, reason)
    revalidatePath('/dashboard/reports')
}
