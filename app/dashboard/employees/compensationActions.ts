'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getChicagoDateString } from '@/lib/payroll/payPeriod'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

async function assertAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' as const, supabase: null, user: null }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        return { error: 'Unauthorized' as const, supabase: null, user: null }
    }

    return { error: null, supabase, user }
}

function parsePayRateToCents(raw: string): number | null {
    const cleaned = raw.trim().replace(/[$,]/g, '')
    if (!cleaned) return null
    const value = Number(cleaned)
    if (!Number.isFinite(value) || value < 0) return null
    return Math.round(value * 100)
}

export async function setEmployeePayRate(formData: FormData) {
    const auth = await assertAdmin()
    if (auth.error || !auth.supabase || !auth.user) {
        return { error: auth.error || 'Unauthorized' }
    }

    const employeeId = String(formData.get('employeeId') || '').trim()
    const rateCents = parsePayRateToCents(String(formData.get('payRate') || ''))
    const effectiveFrom = String(formData.get('effectiveFrom') || '').trim() || getChicagoDateString()
    const note = String(formData.get('note') || '').trim() || null

    if (!employeeId) return { error: 'Employee is required' }
    if (rateCents === null) return { error: 'Enter a valid hourly rate (0 or greater)' }
    if (!DATE_RE.test(effectiveFrom)) return { error: 'Effective date must be YYYY-MM-DD' }

    const { error: rateError } = await auth.supabase
        .from('employee_pay_rates')
        .upsert(
            {
                employee_id: employeeId,
                pay_rate_cents: rateCents,
                effective_from: effectiveFrom,
                note,
                changed_by_user_id: auth.user.id
            },
            { onConflict: 'employee_id,effective_from' }
        )

    if (rateError) {
        return { error: rateError.message || 'Failed to save pay rate' }
    }

    const today = getChicagoDateString()
    const { data: latest } = await auth.supabase
        .from('employee_pay_rates')
        .select('pay_rate_cents')
        .eq('employee_id', employeeId)
        .lte('effective_from', today)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle()

    const currentCents =
        latest?.pay_rate_cents ??
        (effectiveFrom <= today ? rateCents : null)

    if (currentCents !== null) {
        const { error: empError } = await auth.supabase
            .from('employees')
            .update({ pay_rate_cents: currentCents })
            .eq('id', employeeId)

        if (empError) {
            return { error: `Rate saved, but failed to update employee record: ${empError.message}` }
        }
    }

    revalidatePath(`/dashboard/employees/${employeeId}`)
    revalidatePath('/dashboard/employees')
    revalidatePath('/dashboard/payroll')
    revalidatePath('/dashboard/my-pay')
    return { success: true }
}

/** Seed initial rate history after creating an employee. */
export async function seedEmployeeCompensationDefaults(
    employeeId: string,
    payRateCents: number
) {
    const auth = await assertAdmin()
    if (auth.error || !auth.supabase || !auth.user) {
        return { error: auth.error || 'Unauthorized' }
    }

    if (!employeeId) return { error: 'Employee is required' }

    const effectiveFrom = getChicagoDateString()
    const cents = Number.isFinite(payRateCents) && payRateCents >= 0 ? Math.round(payRateCents) : 0

    const { error: rateError } = await auth.supabase
        .from('employee_pay_rates')
        .upsert(
            {
                employee_id: employeeId,
                pay_rate_cents: cents,
                effective_from: effectiveFrom,
                note: 'Initial rate',
                changed_by_user_id: auth.user.id
            },
            { onConflict: 'employee_id,effective_from' }
        )

    if (rateError) {
        return { error: rateError.message || 'Failed to seed pay rate' }
    }

    return { success: true }
}
