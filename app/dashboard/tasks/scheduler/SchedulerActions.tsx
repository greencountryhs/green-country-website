'use client'

import { adminSetTaskInstanceStatus, rescheduleTaskInstance, reassignTaskInstance } from '@/lib/tasks/actions'
import { useState } from 'react'
import { useTransition } from 'react'

export function InstanceActions({
    instanceId,
    currentTargets,
    currentStatus,
    editorData
}: {
    instanceId: string,
    currentTargets: any[],
    currentStatus?: 'scheduled' | 'active' | 'completed' | 'cancelled' | 'reopened',
    editorData: {
        employees: Array<{ id: string, display_name: string }>,
        roles: Array<{ id: string, name: string }>
    }
}) {
    const [isPending, startTransition] = useTransition()
    const [showPopover, setShowPopover] = useState(false)
    const [reassignMode, setReassignMode] = useState(false)
    const [nextStatus, setNextStatus] = useState<'scheduled' | 'active' | 'completed' | 'cancelled' | 'reopened'>(
        currentStatus || 'scheduled'
    )
    const [statusNote, setStatusNote] = useState('')
    const [targetType, setTargetType] = useState<'employee' | 'role' | 'all_crew'>('all_crew')
    const [targetId, setTargetId] = useState('')

    function handleShift(direction: any, days: number = 1) {
        startTransition(async () => {
            await rescheduleTaskInstance(instanceId, direction, days)
            setShowPopover(false)
        })
    }

    function handleReassign(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        startTransition(async () => {
            await reassignTaskInstance(instanceId, targetType, targetId)
            setReassignMode(false)
            setShowPopover(false)
        })
    }

    function handleStatusUpdate() {
        startTransition(async () => {
            await adminSetTaskInstanceStatus(instanceId, nextStatus, statusNote || undefined)
            setStatusNote('')
            setShowPopover(false)
        })
    }

    return (
        <div style={{ position: 'relative', marginTop: '0.5rem' }}>
            <button onClick={() => setShowPopover(!showPopover)} className="cta secondary" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'white', color: '#475569', border: '1px solid #cbd5e1' }}>
                Quick Actions
            </button>
            {showPopover && (
                <div style={{ position: 'absolute', top: '100%', right: 0, background: 'white', border: '1px solid var(--border)', padding: '0.5rem', borderRadius: '4px', zIndex: 10, width: '200px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    {reassignMode ? (
                        <form onSubmit={handleReassign} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.75rem' }}>Target Type</label>
                            <select
                                value={targetType}
                                onChange={(e) => {
                                    setTargetType(e.target.value as any)
                                    setTargetId('')
                                }}
                                style={{ fontSize: '0.75rem', padding: '0.2rem' }}
                            >
                                <option value="employee">Specific Employee</option>
                                <option value="role">Specific Role</option>
                                <option value="all_crew">All Crew</option>
                            </select>
                            {targetType === 'employee' && (
                                <>
                                    <label style={{ fontSize: '0.75rem' }}>Employee</label>
                                    <select
                                        value={targetId}
                                        onChange={(e) => setTargetId(e.target.value)}
                                        required
                                        style={{ fontSize: '0.75rem', padding: '0.2rem' }}
                                    >
                                        <option value="" disabled>-- Select Employee --</option>
                                        {editorData.employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.display_name}</option>
                                        ))}
                                    </select>
                                </>
                            )}
                            {targetType === 'role' && (
                                <>
                                    <label style={{ fontSize: '0.75rem' }}>Role</label>
                                    <select
                                        value={targetId}
                                        onChange={(e) => setTargetId(e.target.value)}
                                        required
                                        style={{ fontSize: '0.75rem', padding: '0.2rem' }}
                                    >
                                        <option value="" disabled>-- Select Role --</option>
                                        {editorData.roles.map(role => (
                                            <option key={role.id} value={role.id}>{role.name}</option>
                                        ))}
                                    </select>
                                </>
                            )}
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                <button type="submit" disabled={isPending} className="cta primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>Save</button>
                                <button type="button" onClick={() => setReassignMode(false)} className="link small" style={{ fontSize: '0.75rem' }}>Cancel</button>
                            </div>
                        </form>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <button disabled title="Edit task is not implemented yet." className="link small" style={{ textAlign: 'left', fontSize: '0.75rem', opacity: 0.6, cursor: 'not-allowed' }}>✎ Edit Task (not available yet)</button>
                            <button onClick={() => setReassignMode(true)} disabled={isPending} className="link small" style={{ textAlign: 'left', fontSize: '0.75rem' }}>👥 Reassign</button>
                            <button onClick={() => handleShift('Push Back 1 Day')} disabled={isPending} className="link small" style={{ textAlign: 'left', fontSize: '0.75rem' }}>📅 Push to Tomorrow</button>
                            <div style={{ marginTop: '0.4rem', borderTop: '1px solid var(--border)', paddingTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <label style={{ fontSize: '0.7rem', color: '#475569' }}>Status</label>
                                <select
                                    value={nextStatus}
                                    onChange={(e) => setNextStatus(e.target.value as any)}
                                    style={{ fontSize: '0.75rem', padding: '0.25rem' }}
                                >
                                    <option value="scheduled">Scheduled</option>
                                    <option value="active">In Progress</option>
                                    <option value="reopened">Reopened</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                                <input
                                    type="text"
                                    value={statusNote}
                                    onChange={(e) => setStatusNote(e.target.value)}
                                    placeholder="Reason (optional)"
                                    style={{ fontSize: '0.75rem', padding: '0.25rem' }}
                                />
                                <button
                                    onClick={handleStatusUpdate}
                                    disabled={isPending}
                                    className="cta secondary"
                                    style={{ fontSize: '0.7rem', padding: '0.25rem 0.4rem' }}
                                >
                                    Save Status
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
