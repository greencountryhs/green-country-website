'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
    setEmployeePayRate,
    setEmployeePaySchedule
} from '@/app/dashboard/employees/compensationActions'
import {
    WEEKDAY_LABELS,
    formatPaydayLagLabel,
    formatScheduleLabel,
    getChicagoDateString
} from '@/lib/payroll/payPeriod'

export type PayRateHistoryItem = {
    id: string
    pay_rate_cents: number
    effective_from: string
    note: string | null
    created_at: string
}

export type PayScheduleHistoryItem = {
    id: string
    period_start_weekday: number
    payday_lag_weeks: number
    effective_from: string
    note: string | null
    created_at: string
}

type Props = {
    employeeId: string
    currentRateCents: number
    currentPeriodStartWeekday: number
    currentPaydayLagWeeks: number
    rateHistory: PayRateHistoryItem[]
    scheduleHistory: PayScheduleHistoryItem[]
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
    currentPeriodStartWeekday,
    currentPaydayLagWeeks,
    rateHistory,
    scheduleHistory
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

    function handleScheduleSubmit(formData: FormData) {
        setStatus(null)
        startTransition(async () => {
            const result = await setEmployeePaySchedule(formData)
            if (result?.error) {
                setStatus({ type: 'error', text: result.error })
                return
            }
            setStatus({ type: 'success', text: 'Pay schedule saved.' })
            router.refresh()
        })
    }

    return (
        <div className="card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginTop: 0 }}>Pay &amp; Schedule</h3>
            <p style={{ margin: '0 0 1rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
                Current rate: <strong style={{ color: 'var(--foreground)' }}>{formatMoney(currentRateCents)}/hr</strong>
                {' · '}
                Schedule:{' '}
                <strong style={{ color: 'var(--foreground)' }}>
                    {formatScheduleLabel(currentPeriodStartWeekday, currentPaydayLagWeeks)}
                </strong>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                <form action={handleRateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
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

                <form action={handleScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <input type="hidden" name="employeeId" value={employeeId} />
                    <strong style={{ fontSize: '0.95rem' }}>Update pay schedule</strong>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)' }}>
                        Work window is 7 days and slides together (Fri–Thu → Thu–Wed → …). Payday is always Friday — choose whether that&apos;s the Friday right after the period ends (e.g. end 9th → pay 10th) or the Friday of the following week (e.g. end 8th → pay 17th).
                    </p>
                    <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                        Period starts on
                        <select
                            name="periodStartWeekday"
                            required
                            defaultValue={String(currentPeriodStartWeekday)}
                            disabled={isPending}
                            style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.55rem', minHeight: 44, borderRadius: 4, border: '1px solid var(--border)' }}
                        >
                            {WEEKDAY_LABELS.map((label, idx) => (
                                <option key={label} value={idx}>
                                    {label}–{WEEKDAY_LABELS[(idx + 6) % 7]}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                        Friday payday timing
                        <select
                            name="paydayLagWeeks"
                            required
                            defaultValue={String(currentPaydayLagWeeks)}
                            disabled={isPending}
                            style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.55rem', minHeight: 44, borderRadius: 4, border: '1px solid var(--border)' }}
                        >
                            <option value={0}>{formatPaydayLagLabel(0)} (legacy)</option>
                            <option value={1}>{formatPaydayLagLabel(1)} (new system)</option>
                        </select>
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
                            placeholder="e.g. Shifted one day toward new schedule"
                            disabled={isPending}
                            style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.55rem', minHeight: 44, borderRadius: 4, border: '1px solid var(--border)' }}
                        />
                    </label>
                    <button type="submit" className="cta secondary" disabled={isPending} style={{ minHeight: 44, marginTop: '0.25rem' }}>
                        {isPending ? 'Saving…' : 'Save schedule'}
                    </button>
                </form>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginTop: '1.5rem' }}>
                <div>
                    <strong style={{ fontSize: '0.9rem' }}>Rate history</strong>
                    {rateHistory.length === 0 ? (
                        <p className="muted" style={{ fontSize: '0.85rem' }}>No rate history yet.</p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0 0' }}>
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
                <div>
                    <strong style={{ fontSize: '0.9rem' }}>Schedule history</strong>
                    {scheduleHistory.length === 0 ? (
                        <p className="muted" style={{ fontSize: '0.85rem' }}>No schedule history yet.</p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0 0' }}>
                            {scheduleHistory.map((row) => (
                                <li key={row.id} style={{ padding: '0.45rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <strong>
                                            {formatScheduleLabel(row.period_start_weekday, row.payday_lag_weeks ?? 0)}
                                        </strong>
                                        <span style={{ color: 'var(--muted)' }}>from {formatDate(row.effective_from)}</span>
                                    </div>
                                    {row.note && <div style={{ color: 'var(--muted)' }}>{row.note}</div>}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}
