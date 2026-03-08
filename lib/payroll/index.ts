'use server'

import { createClient } from '@/utils/supabase/server'
import { CAPABILITIES } from '../auth/capabilities'
import { requireCapability } from '../auth/requireCapability'

/**
 * Retrieves the holding ledger balance for an employee.
 * Uses strict capability check routing.
 */
export async function getHoldingBalance(employeeId: string) {
    const isAuthorized = await requireCapability(CAPABILITIES.VIEW_PAYROLL_SUMMARY)
    if (!isAuthorized) throw new Error("Unauthorized to view payroll summary")

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('holding_account_ledger')
        .select('amount_cents, transaction_type')
        .eq('employee_id', employeeId)

    if (error) console.error("Error fetching ledger:", error)

    // Process credits vs debits
    let balance = 0
    data?.forEach(t => {
        if (t.transaction_type === 'credit') balance += t.amount_cents
        if (t.transaction_type === 'debit') balance -= t.amount_cents
    })

    return balance
}

/**
 * Adds a compensation adjustment to the payroll queue.
 */
export async function addCompAdjustment(employeeId: string, amountCents: number, typeId: string, reason: string) {
    const isAuthorized = await requireCapability(CAPABILITIES.MANAGE_COMP_ADJUSTMENTS)
    if (!isAuthorized) throw new Error("Unauthorized to manage comp adjustments")

    const supabase = await createClient()
    const { error } = await supabase
        .from('employee_comp_adjustments')
        .insert([{
            employee_id: employeeId,
            type_id: typeId,
            amount_cents: amountCents,
            reason: reason,
        }])

    return { error }
}

/**
 * Calculates a basic weekly payroll summary (Foundation Shell)
 */
export async function getWeeklyPayrollSummary(weekStartDate: Date) {
    const isAuthorized = await requireCapability(CAPABILITIES.VIEW_PAYROLL_SUMMARY)
    if (!isAuthorized) throw new Error("Unauthorized")

    // Stubbed structure for future complex implementation
    return {
        total_hours: 0,
        pending_payments: 0,
        holding_balances: 0
    }
}
