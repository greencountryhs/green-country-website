'use client'

import { useState, useEffect } from 'react'
import { createSchedulerInstance } from '@/lib/tasks/actions'

export type TaskEditorTemplate = {
    id: string
    title: string
    defaultDisplayMode: string
    itemCount: number
    previewItems: string[]
}

export type TaskEditorEmployee = { id: string, display_name: string }
export type TaskEditorRole = { id: string, name: string }

export type TaskEditorData = {
    templates: TaskEditorTemplate[]
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
    
    // Type and mode
    const [taskType, setTaskType] = useState<'template' | 'custom'>('template')
    const [templateId, setTemplateId] = useState('')
    const [displayMode, setDisplayMode] = useState<'full' | 'single' | 'section'>('full')
    
    // Target
    const [targetType, setTargetType] = useState<'employee' | 'role' | 'all_crew'>('all_crew')
    const [targetId, setTargetId] = useState('')

    const [isSaving, setIsSaving] = useState(false)

    // Sync selected template preview
    const selectedTemplate = editorData.templates.find(t => t.id === templateId)

    // Reset when opened
    useEffect(() => {
        if (isOpen) {
            setDateStr(defaultDateStr)
            setTitle('')
            setTaskType('template')
            setTemplateId('')
            setDisplayMode('full')
            setTargetType('all_crew')
            setTargetId('')
        }
    }, [isOpen, defaultDateStr])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (taskType === 'template' && !templateId) {
            alert("Please select a template.")
            return
        }
        if (taskType === 'custom' && !title.trim()) {
            alert("Please enter a custom task name.")
            return
        }
        
        if (targetType !== 'all_crew' && !targetId) {
            alert("Please select the target assigned employee or role.")
            return
        }

        setIsSaving(true)
        try {
            const finalTitle = taskType === 'custom' ? title : (selectedTemplate?.title || '')
            const finalTemplateId = taskType === 'template' ? templateId : undefined

            await createSchedulerInstance(
                dateStr,
                finalTitle,
                finalTemplateId,
                displayMode,
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

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <form onSubmit={handleSubmit} className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>Add Task</h2>
                    <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Source Type & Date Row */}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Date</label>
                            <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Task Source</label>
                            <select value={taskType} onChange={(e) => {
                                setTaskType(e.target.value as any)
                                if (e.target.value === 'custom') setTemplateId('')
                            }} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }}>
                                <option value="template">From Template</option>
                                <option value="custom">Custom General Task</option>
                            </select>
                        </div>
                    </div>

                    {/* Template Selection & Preview */}
                    {taskType === 'template' ? (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Template</label>
                            <select value={templateId} onChange={(e) => {
                                const tId = e.target.value;
                                setTemplateId(tId)
                                const t = editorData.templates.find(x => x.id === tId)
                                if (t) setDisplayMode(t.defaultDisplayMode as any)
                            }} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', marginBottom: '0.5rem' }}>
                                <option value="" disabled>-- Select a Template --</option>
                                {editorData.templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.title}</option>
                                ))}
                            </select>
                            
                            {selectedTemplate && (
                                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <strong style={{ color: 'var(--primary)' }}>Preview: {selectedTemplate.title}</strong>
                                        <span style={{ color: 'var(--muted)' }}>{selectedTemplate.itemCount} items total</span>
                                    </div>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#475569' }}>
                                        {selectedTemplate.previewItems.map((item, idx) => (
                                            <li key={idx} style={{ padding: '0.1rem 0' }}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Custom Task Name</label>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Unload specific truck" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }} />
                        </div>
                    )}

                    {/* Assignment Targets */}
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
                            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', marginTop: '0.75rem' }}>
                                <option value="" disabled>-- Select Person --</option>
                                {editorData.employees.map(e => <option key={e.id} value={e.id}>{e.display_name}</option>)}
                            </select>
                        )}
                        
                        {targetType === 'role' && (
                            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', marginTop: '0.75rem' }}>
                                <option value="" disabled>-- Select Role --</option>
                                {editorData.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        )}
                    </div>

                    {/* Display Mode (only explicitly needed if it's a template) */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Display Mode</label>
                        <select value={displayMode} onChange={(e) => setDisplayMode(e.target.value as any)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }}>
                            <option value="full">Static Checklist (Show all items at once)</option>
                            <option value="section">Interactive Section (Show grouped sections)</option>
                            <option value="single">Interactive Single Step (Show one item at a time)</option>
                        </select>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
                            Controls how checklist items appear on the crew's devices.
                        </p>
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
