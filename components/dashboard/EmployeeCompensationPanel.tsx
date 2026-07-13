'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setEmployeePayRate } from '@/app/dashboard/employees/compensationActions'
import { getChicagoDateString } from '@/lib/payroll/payPeriod'

export type PayRateHistoryItem = {
    id: string
    pay_rate_cents: number
    effective_from: string
    note: string | null
    created_at: string
}

type Props = {
    employeeId: string
    currentRateCents: number
    rateHistory: PayRateHistoryItem[]
}

function formatMoney(cents: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function formatDate(dateStr: string) {
    const noon = new Date(`${dateStr}T12:00:00Z`)
    return noon.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export function EmployeeCompensationPanel({
    employeeId,
    currentRateCents,
    rateHistory
}: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [status, setStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

    const today = getChicagoDateString()

    function handleRateSubmit(formData: FormData) {
        setStatus(null)
        startTransition(async () => {
            const result = await setEmployeePayRate(formData)
            if (result?.error) {
                setStatus({ type: 'error', text: result.error })
                return
            }
            setStatus({ type: 'success', text: 'Pay rate saved.' })
            router.refresh()
        })
    }

    return (
        <div className="card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginTop: 0 }}>Pay Rate</h3>
            <p style={{ margin: '0 0 1rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
                Current rate: <strong style={{ color: 'var(--foreground)' }}>{formatMoney(currentRateCents)}/hr</strong>
                {' · '}
                Company schedule: Thu–Wed · paid Friday the following week
            </p>

            {status && (
                <div
                    className="callout"
                    style={{
                        marginBottom: '1rem',
                        background: status.type === 'error' ? '#fef2f2' : '#f0fdf4',
                        color: status.type === 'error' ? '#991b1b' : '#166534',
                        borderColor: status.type === 'error' ? '#f87171' : '#86efac'
                    }}
                >
                    {status.text}
                </div>
            )}

            <form action={handleRateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxWidth: 360 }}>
                <input type="hidden" name="employeeId" value={employeeId} />
                <strong style={{ fontSize: '0.95rem' }}>Update pay rate</strong>
                <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    Hourly rate ($)
                    <input
                        name="payRate"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        required
                        defaultValue={(currentRateCents / 100).toFixed(2)}
                        disabled={isPending}
                        style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.55rem', minHeight: 44, borderRadius: 4, border: '1px solid var(--border)' }}
                    />
                </label>
                <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    Effective from
                    <input
                        name="effectiveFrom"
                        type="date"
                        required
                        defaultValue={today}
                        disabled={isPending}
                        style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.55rem', minHeight: 44, borderRadius: 4, border: '1px solid var(--border)' }}
                    />
                </label>
                <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    Note (optional)
                    <input
                        name="note"
                        type="text"
                        placeholder="e.g. Raise, new hire rate"
                        disabled={isPending}
                        style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.55rem', minHeight: 44, borderRadius: 4, border: '1px solid var(--border)' }}
                    />
                </label>
                <button type="submit" className="cta" disabled={isPending} style={{ minHeight: 44, marginTop: '0.25rem' }}>
                    {isPending ? 'Saving…' : 'Save rate'}
                </button>
            </form>

            <div style={{ marginTop: '1.5rem' }}>
                <strong style={{ fontSize: '0.9rem' }}>Rate history</strong>
                {rateHistory.length === 0 ? (
                    <p className="muted" style={{ fontSize: '0.85rem' }}>No rate history yet.</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0 0', maxWidth: 420 }}>
                        {rateHistory.map((row) => (
                            <li key={row.id} style={{ padding: '0.45rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                                    <strong>{formatMoney(row.pay_rate_cents)}/hr</strong>
                                    <span style={{ color: 'var(--muted)' }}>from {formatDate(row.effective_from)}</span>
                                </div>
                                {row.note && <div style={{ color: 'var(--muted)' }}>{row.note}</div>}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
