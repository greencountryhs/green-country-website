'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { InstanceActions } from './SchedulerActions'

export function TaskCardWithDrawer({ 
    inst, 
    displayTitle, 
    typeLabel, 
    assignmentLabel 
}: { 
    inst: any, 
    displayTitle: string, 
    typeLabel: string, 
    assignmentLabel: string 
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const drawerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Escape listener
    useEffect(() => {
        if (!isOpen) return
        
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setIsOpen(false)
        }
        
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen])

    return (
        <>
            <style>{`
                .task-card-hover {
                    background: white;
                    padding: 0.6rem;
                    border-radius: 4px;
                    border: 1px solid var(--border);
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    position: relative;
                }
                .task-card-hover:hover {
                    border-color: #3b82f6;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    transform: translateY(-1px);
                }
                .task-card-cue {
                    font-size: 0.65rem;
                    color: #94a3b8;
                    margin-top: 0.5rem;
                    border-top: 1px solid #f1f5f9;
                    padding-top: 0.3rem;
                    text-align: right;
                    transition: color 0.2s ease;
                    pointer-events: none; /* Let the card catch the click */
                }
                .task-card-hover:hover .task-card-cue {
                    color: #2563eb;
                }
            `}</style>
            
            {/* IN-GRID COMPACT CARD */}
            <div 
                className="task-card-hover"
                title={displayTitle}
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsOpen(true)
                }}
                role="button"
                tabIndex={0}
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.2rem', marginBottom: '0.25rem', pointerEvents: 'none' }}>
                    <div style={{ 
                        fontSize: '0.9rem', 
                        fontWeight: 600, 
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1
                    }}>
                        {displayTitle}
                    </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem', pointerEvents: 'none' }}>
                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', background: '#f3f4f6', color: '#475569', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                        {typeLabel}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {assignmentLabel}
                    </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', pointerEvents: 'none' }}>
                    <span style={{ color: inst.status === 'completed' ? '#166534' : 'var(--muted)', textTransform: 'capitalize' }}>{inst.status}</span>
                    <span style={{ color: 'var(--muted)' }}>Logs: {inst.completedLogCount}/{inst.logCount}</span>
                </div>

                <div className="task-card-cue">
                    ✎ Click to View / Edit
                </div>
            </div>

            {/* EXTERNAL DRAWER (PORTAL) */}
            {mounted && isOpen && createPortal(
                <div style={{ position: 'relative', zIndex: 99999 }}>
                    {/* BACKDROP */}
                    <div 
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsOpen(false)
                        }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.4)',
                        }}
                    />
                    
                    {/* RIGHT DRAWER */}
                    <div 
                        ref={drawerRef}
                        onClick={(e) => e.stopPropagation()} /* Prevent clicks inside drawer from bubbling to backdrop */
                        style={{
                            position: 'fixed',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            width: '450px',
                            maxWidth: '90vw',
                            backgroundColor: 'white',
                            boxShadow: '-4px 0 15px rgba(0,0,0,0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflowY: 'auto',
                            padding: '1.5rem',
                            animation: 'slideIn 0.2s ease-out forwards'
                        }}
                    >
                        <style>{`
                            @keyframes slideIn {
                                from { transform: translateX(100%); }
                                to { transform: translateX(0); }
                            }
                        `}</style>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, lineHeight: 1.2 }}>{displayTitle}</h2>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setIsOpen(false)
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '1.5rem',
                                    lineHeight: 1,
                                    cursor: 'pointer',
                                    color: 'var(--muted)',
                                    padding: '0.2rem'
                                }}
                            >
                                &times;
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: '#f3f4f6', color: '#475569', borderRadius: '4px' }}>
                                Type: {typeLabel}
                            </span>
                            <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: '#eff6ff', color: '#1d4ed8', borderRadius: '4px' }}>
                                Target: {assignmentLabel}
                            </span>
                            <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: inst.status === 'completed' ? '#dcfce7' : '#fef3c7', color: inst.status === 'completed' ? '#166534' : '#92400e', borderRadius: '4px', textTransform: 'capitalize' }}>
                                Status: {inst.status}
                            </span>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Task Details</h3>
                            <div style={{ fontSize: '0.9rem', color: 'var(--foreground)' }}>
                                <p style={{ margin: '0 0 0.5rem 0' }}><strong>Date:</strong> {new Date(inst.assignmentDate).toLocaleDateString()}</p>
                                <p style={{ margin: '0 0 0.5rem 0' }}><strong>Items Logged:</strong> {inst.completedLogCount} of {inst.logCount}</p>
                            </div>
                            
                            {inst.notes && inst.notes.length > 0 && (
                                <div style={{ marginTop: '1rem' }}>
                                    <strong style={{ fontSize: '0.9rem' }}>Notes:</strong>
                                    <ul style={{ paddingLeft: '1.2rem', margin: '0.5rem 0', fontSize: '0.9rem', color: 'var(--muted)' }}>
                                        {inst.notes.map((n: any, i: number) => (
                                            <li key={i}>{n}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Quick Actions</h3>
                            <InstanceActions instanceId={inst.id} currentTargets={inst.targets} />
                        </div>
                    </div>
                </div>, 
                document.body
            )}
        </>
    )
}
