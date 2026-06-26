'use client'

import { useState, type CSSProperties } from 'react'
import { clockOutTimeEntry } from '@/lib/time/actions'

const labelStyle: CSSProperties = { fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }
const inputStyle: CSSProperties = {
    width: '100%',
    padding: '0.6rem',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    fontSize: '1rem',
    resize: 'vertical',
    minHeight: '3rem',
    boxSizing: 'border-box'
}

const errorBannerStyle: CSSProperties = {
    background: '#fef2f2',
    color: '#991b1b',
    borderColor: '#fecaca',
    marginBottom: '0.75rem'
}

export function ClockOutQuestionnaire({
    entryId,
    onCancel,
    onSuccess,
    onError
}: {
    entryId: string
    onCancel: () => void
    onSuccess: () => void
    onError?: (message: string) => void
}) {
    const [workSummary, setWorkSummary] = useState('')
    const [supplyNeeds, setSupplyNeeds] = useState('')
    const [dayNotes, setDayNotes] = useState('')
    const [blockers, setBlockers] = useState('')
    const [followUp, setFollowUp] = useState(false)
    const [busy, setBusy] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    function reportError(message: string) {
        setErrorMessage(message)
        onError?.(message)
    }

    async function submit() {
        const w = workSummary.trim()
        const s = supplyNeeds.trim()
        if (!w || !s) {
            reportError('Please answer: what you worked on today, and tools/materials low or needed.')
            return
        }
        setBusy(true)
        setErrorMessage(null)
        try {
            const result = await clockOutTimeEntry(entryId, {
                workSummary: w,
                supplyNeeds: s,
                dayNotes: dayNotes.trim() || undefined,
                blockers: blockers.trim() || undefined,
                followUpNeeded: followUp
            })
            if (result.ok === false) {
                reportError(result.error)
                return
            }
            onSuccess()
        } catch (error) {
            console.error('Clock-out questionnaire:', error)
            reportError('An unexpected error occurred while clocking out.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                padding: '0.75rem 0 0 0',
                borderTop: '1px solid var(--border)'
            }}
        >
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Quick end-of-day check</p>

            {errorMessage && (
                <div className="callout" style={errorBannerStyle} role="alert">
                    {errorMessage}
                </div>
            )}

            <div>
                <label style={labelStyle}>
                    What did you work on today? <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                    required
                    rows={2}
                    value={workSummary}
                    onChange={(e) => setWorkSummary(e.target.value)}
                    style={inputStyle}
                    placeholder="Jobs, tasks, sites…"
                />
            </div>

            <div>
                <label style={labelStyle}>
                    Any tools or materials running low / needed? <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                    required
                    rows={2}
                    value={supplyNeeds}
                    onChange={(e) => setSupplyNeeds(e.target.value)}
                    style={inputStyle}
                    placeholder={'None is OK — type "none" if nothing is needed'}
                />
            </div>

            <div>
                <label style={labelStyle}>Any notes from the day?</label>
                <textarea rows={2} value={dayNotes} onChange={(e) => setDayNotes(e.target.value)} style={inputStyle} />
            </div>

            <div>
                <label style={labelStyle}>Any blockers or follow-up items?</label>
                <textarea rows={2} value={blockers} onChange={(e) => setBlockers(e.target.value)} style={inputStyle} />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} />
                Follow-up needed from the office
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={busy}
                    className="cta"
                    style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', background: '#dc2626' }}
                >
                    {busy ? 'Saving…' : 'Submit & clock out'}
                </button>
                <button type="button" onClick={onCancel} disabled={busy} className="cta secondary" style={{ width: '100%', padding: '0.65rem' }}>
                    Cancel
                </button>
            </div>
        </div>
    )
}
