'use client'

import { useState, useEffect } from 'react'
import { mergeChecklistInputs } from '@/lib/tasks/checklistInputs'
import { createCustomTaskInstance } from '@/lib/tasks/actions'

export type TaskEditorEmployee = { id: string, display_name: string }
export type TaskEditorRole = { id: string, name: string }

export type TaskEditorData = {
    employees: TaskEditorEmployee[]
    roles: TaskEditorRole[]
}

export function TaskEditorModal({
    isOpen,
    onClose,
    defaultDateStr,
    editorData
}: {
    isOpen: boolean
    onClose: () => void
    defaultDateStr: string
    editorData: TaskEditorData
}) {
    // Basic fields
    const [dateStr, setDateStr] = useState(defaultDateStr)
    const [title, setTitle] = useState('')
    
    // Target
    const [targetType, setTargetType] = useState<'employee' | 'role' | 'all_crew'>('all_crew')
    const [targetId, setTargetId] = useState('')
    const [checklistItems, setChecklistItems] = useState<string[]>([''])
    const [bulkChecklist, setBulkChecklist] = useState('')

    const [isSaving, setIsSaving] = useState(false)

    // Reset when opened
    useEffect(() => {
        if (isOpen) {
            setDateStr(defaultDateStr)
            setTitle('')
            setTargetType('all_crew')
            setTargetId('')
            setChecklistItems([''])
            setBulkChecklist('')
        }
    }, [isOpen, defaultDateStr])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!title.trim()) {
            alert("Please enter a custom task name.")
            return
        }
        
        if (targetType !== 'all_crew' && !targetId) {
            alert("Please select the target assigned employee or role.")
            return
        }

        setIsSaving(true)
        try {
            const result = await createCustomTaskInstance(
                dateStr,
                title.trim(),
                'full', // custom instances default to full display mode
                targetType,
                targetId,
                checklistItems,
                bulkChecklist
            )
            if (result.checklistVerification && result.checklistVerification.itemCount > 0) {
                console.info('Checklist verification', result.checklistVerification)
            }
            onClose()
        } catch (error: any) {
            console.error(error)
            alert("Failed to schedule: " + error.message)
        } finally {
            setIsSaving(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
            e.preventDefault()
        }
    }

    function addChecklistItem() {
        setChecklistItems((prev) => [...prev, ''])
    }

    function removeChecklistItem(index: number) {
        setChecklistItems((prev) => prev.filter((_, i) => i !== index))
    }

    function updateChecklistItem(index: number, value: string) {
        setChecklistItems((prev) => prev.map((item, i) => i === index ? value : item))
    }

    function pasteChecklistLines() {
        const parsed = mergeChecklistInputs([], bulkChecklist)
        if (parsed.length === 0) return
        setChecklistItems((prev) => [...mergeChecklistInputs(prev, ''), ...parsed])
        setBulkChecklist('')
    }

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <form
                onSubmit={handleSubmit}
                onKeyDown={handleKeyDown}
                className="card"
                style={{
                    width: '100%',
                    maxWidth: '500px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    background: '#ffffff',
                    color: '#111827'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, color: '#111827' }}>Add Custom Task</h2>
                    <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1, color: '#334155' }}>&times;</button>
                </div>
                <div style={{ marginBottom: '0.9rem', padding: '0.45rem 0.65rem', borderRadius: '6px', background: '#dbeafe', color: '#1e3a8a', fontSize: '0.82rem', fontWeight: 600 }}>
                    Checklist builder v2 active
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, color: '#111827' }}>Date</label>
                            <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--ink)', backgroundColor: '#fff' }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, color: '#111827' }}>Task Name</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Unload specific truck" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--ink)', backgroundColor: '#fff' }} />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, color: '#111827' }}>
                            Checklist Items
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {checklistItems.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '0.4rem' }}>
                                    <input
                                        type="text"
                                        value={item}
                                        onChange={(e) => updateChecklistItem(idx, e.target.value)}
                                        placeholder={`Checklist item ${idx + 1}`}
                                        style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--ink)', backgroundColor: '#fff' }}
                                    />
                                    <button type="button" className="cta secondary" onClick={() => removeChecklistItem(idx)} style={{ padding: '0.4rem 0.6rem' }}>
                                        Remove
                                    </button>
                                </div>
                            ))}
                            <div>
                                <button type="button" className="cta secondary" onClick={addChecklistItem}>
                                    Add checklist item
                                </button>
                            </div>
                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.6rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, color: '#111827' }}>
                                    Paste multiple checklist lines (optional)
                                </label>
                                <textarea
                                    value={bulkChecklist}
                                    onChange={(e) => setBulkChecklist(e.target.value)}
                                    placeholder={"Example:\nUnload truck\nSort materials\nSweep bay"}
                                    rows={3}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--ink)', backgroundColor: '#fff', resize: 'vertical' }}
                                />
                                <button type="button" className="cta secondary" onClick={pasteChecklistLines} style={{ marginTop: '0.4rem' }}>
                                    Add pasted lines
                                </button>
                            </div>
                        </div>
                        <p className="small" style={{ marginTop: '0.35rem' }}>
                            Row inputs and pasted lines are both saved on submit. Leave checklist empty for a single-step task.
                        </p>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#111827' }}>Assignment Target</label>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#111827' }}>
                                <input type="radio" checked={targetType === 'all_crew'} onChange={() => setTargetType('all_crew')} />
                                All Crew
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#111827' }}>
                                <input type="radio" checked={targetType === 'employee'} onChange={() => setTargetType('employee')} />
                                Specific Person
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#111827' }}>
                                <input type="radio" checked={targetType === 'role'} onChange={() => setTargetType('role')} />
                                Role
                            </label>
                        </div>
                        
                        {targetType === 'employee' && (
                            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', marginTop: '0.75rem', color: 'var(--ink)', backgroundColor: '#fff' }}>
                                <option value="" disabled>-- Select Person --</option>
                                {editorData.employees.map(e => <option key={e.id} value={e.id}>{e.display_name}</option>)}
                            </select>
                        )}
                        
                        {targetType === 'role' && (
                            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', marginTop: '0.75rem', color: 'var(--ink)', backgroundColor: '#fff' }}>
                                <option value="" disabled>-- Select Role --</option>
                                {editorData.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                        <button type="button" onClick={onClose} className="cta secondary">Cancel</button>
                        <button type="submit" disabled={isSaving} className="cta primary">
                            {isSaving ? 'Saving...' : 'Save & Assign'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
