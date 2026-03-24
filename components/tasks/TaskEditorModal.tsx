'use client'

import { useState, useEffect } from 'react'
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

    const [isSaving, setIsSaving] = useState(false)

    // Reset when opened
    useEffect(() => {
        if (isOpen) {
            setDateStr(defaultDateStr)
            setTitle('')
            setTargetType('all_crew')
            setTargetId('')
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
            await createCustomTaskInstance(
                dateStr,
                title.trim(),
                'full', // custom instances default to full display mode
                targetType,
                targetId
            )
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

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>Add Custom Task</h2>
                    <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Date</label>
                            <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--ink)', backgroundColor: '#fff' }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Task Name</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Unload specific truck" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--ink)', backgroundColor: '#fff' }} />
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Assignment Target</label>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input type="radio" checked={targetType === 'all_crew'} onChange={() => setTargetType('all_crew')} />
                                All Crew
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input type="radio" checked={targetType === 'employee'} onChange={() => setTargetType('employee')} />
                                Specific Person
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
