'use client';

import { useState, useTransition } from 'react';
import {
    createPayrollTransaction,
    deletePayrollTransaction,
    updatePayrollTransaction
} from '@/lib/payroll/actions';
import {
    PAYROLL_ENTRY_TYPES,
    PAYROLL_ENTRY_TYPE_LABELS,
    type PayrollEntryType
} from '@/lib/payroll/transactionTypes';
import type { PayrollTransactionRecord } from '@/lib/payroll/types';

type EmployeeOption = { id: string; display_name: string };

function formatMoney(amount: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function PayrollRecordPanel({
    payday,
    payPeriodStart,
    payPeriodEnd,
    employees
}: {
    payday: string;
    payPeriodStart: string;
    payPeriodEnd: string;
    employees: EmployeeOption[];
}) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [employeeId, setEmployeeId] = useState(employees[0]?.id || '');
    const [transactionDate, setTransactionDate] = useState(payPeriodEnd);
    const [entryType, setEntryType] = useState<PayrollEntryType>('payment');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    function resetForm() {
        setEmployeeId(employees[0]?.id || '');
        setTransactionDate(payPeriodEnd);
        setEntryType('payment');
        setAmount('');
        setNote('');
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        startTransition(async () => {
            try {
                await createPayrollTransaction({
                    employeeId,
                    transactionDate,
                    entryType,
                    amount,
                    note,
                    paydayOverride: payday
                });
                resetForm();
                setOpen(false);
            } catch (err) {
                alert(err instanceof Error ? err.message : 'Failed to save record');
            }
        });
    }

    return (
        <div style={{ marginBottom: '1.5rem' }}>
            <button type="button" className="cta primary" onClick={() => setOpen(true)}>
                Record Payment / Adjustment
            </button>

            {open && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem'
                }}>
                    <form
                        onSubmit={handleSubmit}
                        className="card"
                        style={{ width: 'min(92vw, 480px)', maxHeight: '90vh', overflowY: 'auto' }}
                    >
                        <h3 style={{ marginTop: 0 }}>Record Payment / Adjustment</h3>
                        <p className="small" style={{ color: 'var(--muted)' }}>
                            Date must fall within this pay period ({payPeriodStart} – {payPeriodEnd}).
                        </p>

                        <label style={{ display: 'block', fontWeight: 600, marginTop: '0.75rem' }}>Employee</label>
                        <select
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            required
                            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                        >
                            {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>{emp.display_name}</option>
                            ))}
                        </select>

                        <label style={{ display: 'block', fontWeight: 600, marginTop: '0.75rem' }}>Date</label>
                        <input
                            type="date"
                            value={transactionDate}
                            min={payPeriodStart}
                            max={payPeriodEnd}
                            onChange={(e) => setTransactionDate(e.target.value)}
                            required
                            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                        />

                        <label style={{ display: 'block', fontWeight: 600, marginTop: '0.75rem' }}>Type</label>
                        <select
                            value={entryType}
                            onChange={(e) => setEntryType(e.target.value as PayrollEntryType)}
                            required
                            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                        >
                            {PAYROLL_ENTRY_TYPES.map((type) => (
                                <option key={type} value={type}>{PAYROLL_ENTRY_TYPE_LABELS[type]}</option>
                            ))}
                        </select>

                        <label style={{ display: 'block', fontWeight: 600, marginTop: '0.75rem' }}>Amount ($)</label>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                        />

                        <label style={{ display: 'block', fontWeight: 600, marginTop: '0.75rem' }}>Note</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={2}
                            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                            placeholder="Optional description"
                        />

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                            <button type="button" className="cta secondary" onClick={() => setOpen(false)} disabled={isPending}>
                                Cancel
                            </button>
                            <button type="submit" className="cta primary" disabled={isPending}>
                                {isPending ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export function EmployeePayrollTransactions({
    employeeId,
    payday,
    payPeriodStart,
    payPeriodEnd,
    transactions,
    employees
}: {
    employeeId: string;
    payday: string;
    payPeriodStart: string;
    payPeriodEnd: string;
    transactions: PayrollTransactionRecord[];
    employees: EmployeeOption[];
}) {
    const [isPending, startTransition] = useTransition();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editType, setEditType] = useState<PayrollEntryType>('payment');
    const [editDate, setEditDate] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editNote, setEditNote] = useState('');

    if (transactions.length === 0) {
        return null;
    }

    function startEdit(tx: PayrollTransactionRecord) {
        setEditingId(tx.id);
        setEditType(tx.entry_type as PayrollEntryType);
        setEditDate(tx.transaction_date);
        setEditAmount((tx.amount_cents / 100).toFixed(2));
        setEditNote(tx.note || '');
    }

    function handleUpdate(id: string) {
        startTransition(async () => {
            try {
                await updatePayrollTransaction({
                    id,
                    employeeId,
                    transactionDate: editDate,
                    entryType: editType,
                    amount: editAmount,
                    note: editNote,
                    paydayOverride: payday
                });
                setEditingId(null);
            } catch (err) {
                alert(err instanceof Error ? err.message : 'Failed to update record');
            }
        });
    }

    function handleDelete(id: string) {
        if (!window.confirm('Delete this payment/adjustment record?')) return;
        startTransition(async () => {
            try {
                await deletePayrollTransaction(id);
            } catch (err) {
                alert(err instanceof Error ? err.message : 'Failed to delete record');
            }
        });
    }

    return (
        <div style={{ marginTop: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>Payments &amp; adjustments</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {transactions.map((tx) => (
                    <div key={tx.id} style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                        {editingId === tx.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <select value={editType} onChange={(e) => setEditType(e.target.value as PayrollEntryType)} style={{ padding: '0.35rem' }}>
                                    {PAYROLL_ENTRY_TYPES.map((type) => (
                                        <option key={type} value={type}>{PAYROLL_ENTRY_TYPE_LABELS[type]}</option>
                                    ))}
                                </select>
                                <input type="date" value={editDate} min={payPeriodStart} max={payPeriodEnd} onChange={(e) => setEditDate(e.target.value)} style={{ padding: '0.35rem' }} />
                                <input type="number" min="0.01" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} style={{ padding: '0.35rem' }} />
                                <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} rows={2} style={{ padding: '0.35rem' }} />
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button type="button" className="cta primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} disabled={isPending} onClick={() => handleUpdate(tx.id)}>Save</button>
                                    <button type="button" className="cta secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} disabled={isPending} onClick={() => setEditingId(null)}>Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                                    <div>
                                        <strong>{PAYROLL_ENTRY_TYPE_LABELS[tx.entry_type as PayrollEntryType] || tx.entry_type}</strong>
                                        <span style={{ color: 'var(--muted)', marginLeft: '0.5rem' }}>{tx.transaction_date}</span>
                                    </div>
                                    <strong>{formatMoney(tx.amount_cents / 100)}</strong>
                                </div>
                                {tx.note && <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: '#475569' }}>{tx.note}</p>}
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                    <button type="button" className="link small" disabled={isPending} onClick={() => startEdit(tx)}>Edit</button>
                                    <button type="button" className="link small" style={{ color: '#b91c1c' }} disabled={isPending} onClick={() => handleDelete(tx.id)}>Delete</button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
