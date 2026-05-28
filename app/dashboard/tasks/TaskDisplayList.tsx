'use client'

import { useState } from 'react'
import {
    completeTaskInstanceAsCrew,
    logTaskItem,
    requestTaskReopenAsCrew,
    undoTaskCompletionAsCrew
} from '@/lib/tasks/actions'

/**
 * Shell component for rendering full, section, or single flow tasks.
 * Currently hardcodes a quick demo list since the deep relational fetch requires 
 * joining template_items down the chain which can be expanded later.
 */
export function TaskDisplayList({
    instanceId,
    employeeId,
    displayMode,
    initialItems,
    initialStatus
}: {
    instanceId: string,
    employeeId: string,
    displayMode: string,
    initialItems: any[],
    initialStatus: 'scheduled' | 'active' | 'completed' | 'cancelled' | 'reopened'
}) {
    const [items, setItems] = useState(initialItems)
    const [instanceStatus, setInstanceStatus] = useState(initialStatus)
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [reopenReason, setReopenReason] = useState('')

    async function handleComplete(itemId: string) {
        // Optimistic UI update
        setItems(items.map(i => i.id === itemId ? { ...i, completed: true } : i))

        // Backend persistent log
        const actualLogId = itemId === 'custom' ? null : itemId;
        await logTaskItem(instanceId, actualLogId)
    }

    async function markTaskComplete() {
        const confirmed = window.confirm(
            'Mark this task complete? This will notify the owner that the task is finished.'
        )
        if (!confirmed) return

        setBusy(true)
        setMessage(null)
        try {
            await completeTaskInstanceAsCrew(instanceId, 'Crew marked task complete from checklist UI')
            setInstanceStatus('completed')
            setMessage('Task marked complete. Undo is available for a short window.')
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Failed to mark task complete')
        } finally {
            setBusy(false)
        }
    }

    async function undoCompletion() {
        setBusy(true)
        setMessage(null)
        try {
            const result = await undoTaskCompletionAsCrew(instanceId)
            setInstanceStatus(result.newStatus as any)
            setMessage('Completion undone successfully.')
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Undo failed')
        } finally {
            setBusy(false)
        }
    }

    async function requestReopen() {
        setBusy(true)
        setMessage(null)
        try {
            await requestTaskReopenAsCrew(instanceId, reopenReason || undefined)
            setMessage('Reopen request sent to owner/admin.')
            setReopenReason('')
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Failed to request reopen')
        } finally {
            setBusy(false)
        }
    }

    const progressPercent = items.length > 0 
        ? Math.round((items.filter(i => i.completed).length / items.length) * 100)
        : 100;
    const allCompleted = items.length === 0 || progressPercent === 100;

    // For single/section reveal logic:
    const nextIncompleteIndex = items.findIndex(i => !i.completed)
    const activeItem = nextIncompleteIndex >= 0 ? items[nextIncompleteIndex] : null;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <span className="small">Instance status</span>
                <span
                    className="badge"
                    style={{
                        background: instanceStatus === 'completed' ? '#dcfce7' : '#f3f4f6',
                        color: instanceStatus === 'completed' ? '#166534' : '#334155',
                        border: 'none',
                        textTransform: 'capitalize'
                    }}
                >
                    {instanceStatus}
                </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--muted)' }}>
                <span>Mode: <strong>{displayMode.toUpperCase()}</strong></span>
                <span>{progressPercent}% Complete</span>
            </div>

            <div style={{ background: '#e5e7eb', height: '6px', borderRadius: '3px', marginBottom: '1.5rem', overflow: 'hidden' }}>
                <div style={{ background: 'var(--primary)', height: '100%', width: `${progressPercent}%`, transition: 'width 0.3s ease' }} />
            </div>

            {/* FULL MODE: Shows all items at once */}
            {displayMode === 'full' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {items.map(item => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: item.completed ? '#f3f4f6' : '#ffffff', border: '1px solid var(--border)', borderRadius: '6px', opacity: item.completed ? 0.6 : 1 }}>
                            <input
                                type="checkbox"
                                checked={item.completed}
                                onChange={() => handleComplete(item.id)}
                                disabled={item.completed || instanceStatus === 'completed'}
                                style={{ width: '20px', height: '20px' }}
                            />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <span style={{ textDecoration: item.completed ? 'line-through' : 'none' }}>
                                    {item.content}
                                </span>
                                {item.completed && item.completedBy && (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                                        Completed by {item.completedBy} on {new Date(item.completedAt).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* SINGLE MODE: Shows only the exact next task */}
            {(displayMode === 'single' || displayMode === 'section') && (
                <div>
                    {!allCompleted ? (
                        <div style={{ padding: '1.5rem', background: '#ffffff', border: '2px solid var(--primary)', borderRadius: '8px', textAlign: 'center' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0' }}>{activeItem.content}</h3>
                            <button
                                onClick={() => handleComplete(activeItem.id)}
                                className="cta"
                                disabled={instanceStatus === 'completed'}
                                style={{ width: '100%' }}
                            >
                                Complete Step
                            </button>
                        </div>
                    ) : (
                        <div style={{ padding: '2rem', background: '#dcfce7', color: '#166534', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                            All tasks complete for this assignment!
                        </div>
                    )}
                </div>
            )}

            {allCompleted && instanceStatus !== 'completed' && (
                <div style={{ marginTop: '1rem' }}>
                    <button className="cta" onClick={markTaskComplete} disabled={busy}>
                        Mark Task Complete
                    </button>
                </div>
            )}

            {instanceStatus === 'completed' && (
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div>
                        <button className="cta secondary" onClick={undoCompletion} disabled={busy}>
                            Undo Complete
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="Reason for reopen request (optional)"
                            value={reopenReason}
                            onChange={(e) => setReopenReason(e.target.value)}
                            style={{ flex: 1, minWidth: '220px', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                        />
                        <button className="cta secondary" onClick={requestReopen} disabled={busy}>
                            Request Reopen
                        </button>
                    </div>
                </div>
            )}

            {message && (
                <p className="small" style={{ marginTop: '0.7rem' }}>
                    {message}
                </p>
            )}
        </div>
    )
}
