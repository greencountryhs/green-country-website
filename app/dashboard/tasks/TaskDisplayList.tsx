'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    completeTaskInstanceAsCrew,
    fetchCrewTaskChecklist,
    requestTaskReopenAsCrew,
    startTaskInstanceAsCrew,
    toggleTaskItemStatus,
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
    const router = useRouter()
    const [items, setItems] = useState(initialItems)
    const [instanceStatus, setInstanceStatus] = useState(initialStatus)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        setItems(initialItems)
        setInstanceStatus(initialStatus)
    }, [initialItems, initialStatus, instanceId])

    async function refreshChecklistFromServer() {
        const refreshed = await fetchCrewTaskChecklist(instanceId)
        setItems(refreshed.items)
        return refreshed
    }
    const [message, setMessage] = useState<string | null>(null)
    const [reopenReason, setReopenReason] = useState('')
    const [showCompleteDialog, setShowCompleteDialog] = useState(false)
    const [completionNote, setCompletionNote] = useState('')

    async function handleToggleItem(itemId: string, nextCompleted: boolean) {
        if (instanceStatus === 'completed') return
        // Optimistic UI update
        const previous = items
        setItems(items.map(i => i.id === itemId ? { ...i, completed: nextCompleted } : i))
        setMessage(null)
        try {
            const actualLogId = itemId === 'custom' ? null : itemId
            await toggleTaskItemStatus(instanceId, actualLogId, nextCompleted)
        } catch (error) {
            setItems(previous)
            setMessage(error instanceof Error ? error.message : 'Failed to update checklist item')
        }
    }

    async function startTask() {
        setBusy(true)
        setMessage(null)
        try {
            await startTaskInstanceAsCrew(instanceId)
            setInstanceStatus('active')
            await refreshChecklistFromServer()
            router.refresh()
            setMessage('Task marked in progress.')
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Failed to start task')
        } finally {
            setBusy(false)
        }
    }

    async function markTaskComplete() {
        setBusy(true)
        setMessage(null)
        try {
            await completeTaskInstanceAsCrew(instanceId, completionNote || 'Crew marked task complete from checklist UI')
            setInstanceStatus('completed')
            setMessage('Task marked complete. Undo is available for a short window.')
            setShowCompleteDialog(false)
            setCompletionNote('')
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
    const checklistVisible = instanceStatus === 'active' || instanceStatus === 'completed'

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

            {checklistVisible && (
                <h3 style={{ margin: '0 0 0.8rem 0', fontSize: '1rem' }}>Checklist</h3>
            )}

            {/* FULL MODE: Shows all items at once */}
            {displayMode === 'full' && checklistVisible && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {items.map(item => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: item.completed ? '#f3f4f6' : '#ffffff', border: '1px solid var(--border)', borderRadius: '6px', opacity: item.completed ? 0.6 : 1 }}>
                            <input
                                type="checkbox"
                                checked={item.completed}
                                onChange={(e) => handleToggleItem(item.id, e.target.checked)}
                                disabled={instanceStatus === 'completed'}
                                style={{ width: '20px', height: '20px' }}
                            />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <span style={{ textDecoration: item.completed ? 'line-through' : 'none' }}>
                                    {item.content}
                                </span>
                                {item.completed && item.completedBy && (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                                        Completed by {item.completedBy} on {new Date(item.completedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* SINGLE MODE: Shows only the exact next task */}
            {(displayMode === 'single' || displayMode === 'section') && checklistVisible && (
                <div>
                    {!allCompleted ? (
                        <div style={{ padding: '1.5rem', background: '#ffffff', border: '2px solid var(--primary)', borderRadius: '8px', textAlign: 'center' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0' }}>{activeItem.content}</h3>
                            <button
                                onClick={() => handleToggleItem(activeItem.id, true)}
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

            {!checklistVisible && (instanceStatus === 'scheduled' || instanceStatus === 'reopened') && (
                <div className="callout" style={{ marginTop: '0.8rem', background: '#f8fafc' }}>
                    <p style={{ margin: 0, color: '#475569' }}>
                        Start this task to reveal its checklist items.
                    </p>
                </div>
            )}

            {checklistVisible && items.length === 0 && (
                <div className="callout" style={{ marginTop: '0.4rem', background: '#fff7ed', borderColor: '#fed7aa' }}>
                    <p style={{ margin: 0, color: '#9a3412' }}>
                        No checklist items for this task.
                    </p>
                </div>
            )}

            {(instanceStatus === 'scheduled' || instanceStatus === 'reopened') && (
                <div style={{ marginTop: '1rem' }}>
                    <button className="cta secondary" onClick={startTask} disabled={busy}>
                        Start Task
                    </button>
                </div>
            )}

            {allCompleted && checklistVisible && instanceStatus !== 'completed' && (
                <div style={{ marginTop: '1rem' }}>
                    <button className="cta" onClick={() => setShowCompleteDialog(true)} disabled={busy}>
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

            {showCompleteDialog && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ width: 'min(92vw, 520px)' }}>
                        <h3 style={{ marginTop: 0 }}>Mark this task complete?</h3>
                        <p className="small" style={{ marginTop: '0.3rem' }}>
                            This will notify the owner that the task is finished.
                        </p>
                        <label style={{ display: 'block', fontWeight: 600, marginTop: '0.8rem' }}>
                            Completion note (optional)
                        </label>
                        <textarea
                            value={completionNote}
                            onChange={(e) => setCompletionNote(e.target.value)}
                            rows={3}
                            style={{ width: '100%', marginTop: '0.4rem', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '8px' }}
                            placeholder="Anything the owner should know?"
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1rem' }}>
                            <button className="cta secondary" onClick={() => setShowCompleteDialog(false)} disabled={busy}>Cancel</button>
                            <button className="cta" onClick={markTaskComplete} disabled={busy}>Confirm Complete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
