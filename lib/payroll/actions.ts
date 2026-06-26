'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { getPayPeriodForWorkDate } from './payPeriod';
import {
    isPayrollEntryType,
    parseAmountToCents,
    type PayrollEntryType
} from './transactionTypes';

async function assertAdminPayrollWriter() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('Unauthorized');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'admin') {
        throw new Error('Unauthorized');
    }

    return supabase;
}

function resolvePayPeriodForTransactionDate(transactionDate: string) {
    const period = getPayPeriodForWorkDate(transactionDate);
    return {
        pay_period_start: period.periodStart,
        pay_period_end: period.periodEnd,
        payday: period.payday
    };
}

export async function createPayrollTransaction(input: {
    employeeId: string;
    transactionDate: string;
    entryType: string;
    amount: string | number;
    note?: string;
    paydayOverride?: string;
}) {
    const supabase = await assertAdminPayrollWriter();

    if (!input.employeeId || !input.transactionDate) {
        throw new Error('Employee and date are required');
    }
    if (!isPayrollEntryType(input.entryType)) {
        throw new Error('Invalid entry type');
    }

    const amountCents = parseAmountToCents(input.amount);
    const period = resolvePayPeriodForTransactionDate(input.transactionDate);

    if (input.paydayOverride && input.paydayOverride !== period.payday) {
        throw new Error('Transaction date does not belong to the selected pay period');
    }

    const { data, error } = await supabase
        .from('payroll_transactions')
        .insert([{
            employee_id: input.employeeId,
            transaction_date: input.transactionDate,
            pay_period_start: period.pay_period_start,
            pay_period_end: period.pay_period_end,
            payday: period.payday,
            entry_type: input.entryType as PayrollEntryType,
            amount_cents: amountCents,
            note: input.note?.trim() || null,
            updated_at: new Date().toISOString()
        }])
        .select('id')
        .single();

    if (error || !data) {
        throw new Error(error?.message || 'Failed to record payroll transaction');
    }

    revalidatePath('/dashboard/payroll');
    return { success: true, id: data.id };
}

export async function updatePayrollTransaction(input: {
    id: string;
    employeeId: string;
    transactionDate: string;
    entryType: string;
    amount: string | number;
    note?: string;
    paydayOverride?: string;
}) {
    const supabase = await assertAdminPayrollWriter();

    if (!input.id) {
        throw new Error('Transaction id is required');
    }
    if (!isPayrollEntryType(input.entryType)) {
        throw new Error('Invalid entry type');
    }

    const amountCents = parseAmountToCents(input.amount);
    const period = resolvePayPeriodForTransactionDate(input.transactionDate);

    if (input.paydayOverride && input.paydayOverride !== period.payday) {
        throw new Error('Transaction date does not belong to the selected pay period');
    }

    const { error } = await supabase
        .from('payroll_transactions')
        .update({
            employee_id: input.employeeId,
            transaction_date: input.transactionDate,
            pay_period_start: period.pay_period_start,
            pay_period_end: period.pay_period_end,
            payday: period.payday,
            entry_type: input.entryType as PayrollEntryType,
            amount_cents: amountCents,
            note: input.note?.trim() || null,
            updated_at: new Date().toISOString()
        })
        .eq('id', input.id);

    if (error) {
        throw new Error(error.message || 'Failed to update payroll transaction');
    }

    revalidatePath('/dashboard/payroll');
    return { success: true };
}

export async function deletePayrollTransaction(id: string) {
    const supabase = await assertAdminPayrollWriter();

    if (!id) {
        throw new Error('Transaction id is required');
    }

    const { error } = await supabase
        .from('payroll_transactions')
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(error.message || 'Failed to delete payroll transaction');
    }

    revalidatePath('/dashboard/payroll');
    return { success: true };
}
