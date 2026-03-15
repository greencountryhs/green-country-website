'use server'

import { correctTimeEntry, createManualTimeEntry, deleteTimeEntry } from '@/lib/reports'
import { revalidatePath } from 'next/cache'

// Parse datetime-local string to ISO ensuring it picks up server local properly,
// but for a lightweight V1, passing it through Date() handles browser local -> UTC.
function parseLocalTime(localStr: string | null) {
    if (!localStr) return null
    return new Date(localStr).toISOString()
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
