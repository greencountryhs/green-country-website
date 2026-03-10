'use client'

import { useState } from 'react'
import { createSchedulerInstance } from '@/lib/tasks/actions'

export function SchedulerModal({
    isOpen,
    onClose,
    selectedDateStr,
    templates
}: {
    isOpen: boolean
    onClose: () => void
    selectedDateStr: string
    templates: { id: string, title: string }[]
}) {
    const [dateStr, setDateStr] = useState(selectedDateStr)
    const [title, setTitle] = useState('')
    const [templateId, setTemplateId] = useState('')
    const [displayMode, setDisplayMode] = useState<'full' | 'single' | 'section'>('full')
    const [isSaving, setIsSaving] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!dateStr || (!title && !templateId)) {
            alert("Please provide a name or select a template.")
            return
        }

        setIsSaving(true)
        try {
            await createSchedulerInstance(
                dateStr,
                title || (templates.find(t => t.id === templateId)?.title || ''),
                templateId || undefined,
                displayMode
            )
            onClose()
            // Reset state
            setTitle('')
            setTemplateId('')
        } catch (error: any) {
            console.error(error)
            alert("Failed to schedule: " + error.message)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <form onSubmit={handleSubmit} className="callout" style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', minWidth: '400px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0 }}>Schedule Task</h2>
                    <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Date</label>
                        <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }} />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Template (Optional)</label>
                        <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }}>
                            <option value="">-- No Template (Custom Task) --</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.title}</option>
                            ))}
                        </select>
                    </div>

                    {!templateId && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Custom Task Name</label>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required={!templateId} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }} />
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Display Mode</label>
                        <select value={displayMode} onChange={(e) => setDisplayMode(e.target.value as any)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }}>
                            <option value="full">Full (All sections)</option>
                            <option value="section">Section</option>
                            <option value="single">Single Task</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                        <button type="button" onClick={onClose} className="cta secondary">Cancel</button>
                        <button type="submit" disabled={isSaving} className="cta primary">
                            {isSaving ? 'Saving...' : 'Schedule'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
