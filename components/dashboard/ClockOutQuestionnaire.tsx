'use client'

import { useState, type CSSProperties } from 'react'
import { createClient } from '@/utils/supabase/client'

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

export function ClockOutQuestionnaire({
    entryId,
    onCancel,
    onSuccess
}: {
    entryId: string
    onCancel: () => void
    onSuccess: () => void
}) {
    const [workSummary, setWorkSummary] = useState('')
    const [supplyNeeds, setSupplyNeeds] = useState('')
    const [dayNotes, setDayNotes] = useState('')
    const [blockers, setBlockers] = useState('')
    const [followUp, setFollowUp] = useState(false)
    const [busy, setBusy] = useState(false)

    async function submit() {
        const w = workSummary.trim()
        const s = supplyNeeds.trim()
        if (!w || !s) {
            alert('Please answer: what you worked on today, and tools/materials low or needed.')
            return
        }
        setBusy(true)
        const supabase = createClient()
        const now = new Date().toISOString()
        const { error } = await supabase
            .from('time_entries')
            .update({
                clock_out: now,
                clock_out_work_summary: w,
                clock_out_supply_needs: s,
                clock_out_day_notes: dayNotes.trim() || null,
                clock_out_blockers: blockers.trim() || null,
                clock_out_follow_up_needed: followUp
            })
            .eq('id', entryId)

        setBusy(false)
        if (error) {
            console.error('Clock-out questionnaire:', error)
            alert('Failed to clock out')
            return
        }
        onSuccess()
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
