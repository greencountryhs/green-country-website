'use client'

import { useState } from 'react'
import { logTaskItem } from '@/lib/tasks/actions'
import { SubmitButton } from '@/components/submit-button'

/**
 * Shell component for rendering full, section, or single flow tasks.
 * Currently hardcodes a quick demo list since the deep relational fetch requires 
 * joining template_items down the chain which can be expanded later.
 */
export function TaskDisplayList({
    instanceId,
    employeeId,
    displayMode
}: {
    instanceId: string,
    employeeId: string,
    displayMode: string
}) {
    // Demonstration hardcoded items to simulate the UI layer progression requirement
    const [items, setItems] = useState([
        { id: 'item-1', content: 'Unload standard equipment', completed: false },
        { id: 'item-2', content: 'Secure area parameters', completed: false },
        { id: 'item-3', content: 'Complete phase 1 installation', completed: false }
    ])

    async function handleComplete(itemId: string) {
        // Optimistic UI update
        setItems(items.map(i => i.id === itemId ? { ...i, completed: true } : i))

        // Backend persistent log
        await logTaskItem(instanceId, itemId, employeeId)
    }

    const progressPercent = Math.round((items.filter(i => i.completed).length / items.length) * 100)
    const allCompleted = progressPercent === 100

    // For single/section reveal logic:
    const nextIncompleteIndex = items.findIndex(i => !i.completed)
    const activeItem = items[nextIncompleteIndex]

    return (
        <div>
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
                                disabled={item.completed}
                                style={{ width: '20px', height: '20px' }}
                            />
                            <span style={{ textDecoration: item.completed ? 'line-through' : 'none' }}>
                                {item.content}
                            </span>
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
        </div>
    )
}
