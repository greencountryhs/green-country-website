'use client'

import { rescheduleTaskInstance, reassignTaskInstance } from '@/lib/tasks/actions'
import { useState } from 'react'
import { useTransition } from 'react'

export function InstanceActions({ instanceId, currentTargets }: { instanceId: string, currentTargets: any[] }) {
    const [isPending, startTransition] = useTransition()
    const [showPopover, setShowPopover] = useState(false)
    const [reassignMode, setReassignMode] = useState(false)

    function handleShift(direction: any, days: number = 1) {
        startTransition(async () => {
            await rescheduleTaskInstance(instanceId, direction, days)
            setShowPopover(false)
        })
    }

    function handleReassign(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const targetType = fd.get('targetType') as string
        const targetId = fd.get('targetId') as string // UUID or empty
        startTransition(async () => {
            await reassignTaskInstance(instanceId, targetType, targetId)
            setReassignMode(false)
            setShowPopover(false)
        })
    }

    return (
        <div style={{ position: 'relative', marginTop: '0.5rem' }}>
            <button onClick={() => setShowPopover(!showPopover)} className="link small" style={{ fontSize: '0.75rem', padding: 0 }}>
                Manage
            </button>
            {showPopover && (
                <div style={{ position: 'absolute', top: '100%', left: 0, background: 'white', border: '1px solid var(--border)', padding: '0.5rem', borderRadius: '4px', zIndex: 10, width: '200px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    {reassignMode ? (
                        <form onSubmit={handleReassign} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.75rem' }}>Target Type</label>
                            <select name="targetType" defaultValue="all_crew" style={{ fontSize: '0.75rem', padding: '0.2rem' }}>
                                <option value="employee">Specific Employee</option>
                                <option value="role">Specific Role</option>
                                <option value="all_crew">All Crew</option>
                            </select>
                            <label style={{ fontSize: '0.75rem' }}>Target ID (if specific)</label>
                            <input type="text" name="targetId" placeholder="UUID" style={{ fontSize: '0.75rem', padding: '0.2rem' }} />
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                <button type="submit" disabled={isPending} className="cta primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>Save</button>
                                <button type="button" onClick={() => setReassignMode(false)} className="link small" style={{ fontSize: '0.75rem' }}>Cancel</button>
                            </div>
                        </form>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <button onClick={() => handleShift('Pull Forward 1 Day')} disabled={isPending} className="link small" style={{ textAlign: 'left', fontSize: '0.75rem' }}>&larr; Pull Forward 1 Day</button>
                            <button onClick={() => handleShift('Push Back 1 Day')} disabled={isPending} className="link small" style={{ textAlign: 'left', fontSize: '0.75rem' }}>Push Back 1 Day &rarr;</button>
                            <hr style={{ margin: '0.25rem 0', borderColor: 'var(--border)' }} />
                            <button onClick={() => setReassignMode(true)} disabled={isPending} className="link small" style={{ textAlign: 'left', fontSize: '0.75rem' }}>Reassign Targets</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
