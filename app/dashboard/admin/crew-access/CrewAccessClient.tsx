'use client'

import { useState } from 'react'
import { adminSetTempPassword, adminRepairLink, adminSendInvite } from './actions'

type EmployeeMergedData = {
    employee_id: string;
    display_name: string;
    employee_email: string | null;
    active: boolean;
    linked_user_id: string | null;
    auth_user: any | null; // From listUsers()
}

export function CrewAccessClient({ crewData }: { crewData: EmployeeMergedData[] }) {
    const [actionStatus, setActionStatus] = useState<{ type: 'error' | 'success', text: string } | null>(null)
    const [tempPasswordContext, setTempPasswordContext] = useState<{ authUserId: string, name: string } | null>(null)
    const [tempPasswordValue, setTempPasswordValue] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    // Used for link repair
    const [repairContext, setRepairContext] = useState<{ employeeId: string, name: string } | null>(null)
    const [repairUserIdInput, setRepairUserIdInput] = useState('')

    const handleSendInvite = async (employeeId: string, email: string) => {
        setActionStatus(null)
        if (!email) {
            setActionStatus({ type: 'error', text: "Cannot invite: Employee record has no email address." })
            return
        }
        if (!confirm(`Are you sure you want to trigger a Supabase Invite email to ${email}?`)) return

        setIsSaving(true)
        const res = await adminSendInvite(employeeId, email)
        if (res?.error) {
            setActionStatus({ type: 'error', text: res.error })
        } else {
            setActionStatus({ type: 'success', text: `Invite dispatched successfully to ${email}.` })
        }
        setIsSaving(false)
    }

    const handleSetTempPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!tempPasswordContext || !tempPasswordValue) return

        setIsSaving(true)
        setActionStatus(null)
        const res = await adminSetTempPassword(tempPasswordContext.authUserId, tempPasswordValue)

        if (res?.error) {
            setActionStatus({ type: 'error', text: res.error })
        } else {
            setActionStatus({ type: 'success', text: `Temporary password successfully enforced for ${tempPasswordContext.name}.` })
            setTempPasswordContext(null)
            setTempPasswordValue('')
        }
        setIsSaving(false)
    }

    const handleRepairLink = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!repairContext) return

        setIsSaving(true)
        setActionStatus(null)

        // If empty input, unlink entirely
        const targetId = repairUserIdInput.trim() || null

        const res = await adminRepairLink(repairContext.employeeId, targetId)

        if (res?.error) {
            setActionStatus({ type: 'error', text: res.error })
        } else {
            setActionStatus({ type: 'success', text: `Linkage successfully updated for ${repairContext.name}.` })
            setRepairContext(null)
            setRepairUserIdInput('')
        }
        setIsSaving(false)
    }

    const handleUnlink = async (employeeId: string, name: string) => {
        if (!confirm(`Are you sure you want to unlink auth for ${name}? They will lose login access but their data stays intact.`)) return

        setIsSaving(true)
        setActionStatus(null)
        const res = await adminRepairLink(employeeId, null)
        if (res?.error) {
            setActionStatus({ type: 'error', text: res.error })
        } else {
            setActionStatus({ type: 'success', text: `Auth link removed for ${name}.` })
        }
        setIsSaving(false)
    }

    return (
        <div>
            {actionStatus && (
                <div style={{ padding: '1rem', marginBottom: '1.5rem', borderRadius: '8px', border: `1px solid ${actionStatus.type === 'error' ? '#fca5a5' : '#86efac'}`, background: actionStatus.type === 'error' ? '#fef2f2' : '#f0fdf4', color: actionStatus.type === 'error' ? '#991b1b' : '#166534', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{actionStatus.text}</span>
                    <button onClick={() => setActionStatus(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'inherit' }}>×</button>
                </div>
            )}

            {/* MODALS */}
            {tempPasswordContext && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <form onSubmit={handleSetTempPassword} className="callout" style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', width: '400px' }}>
                        <h3>Set Temp Password for {tempPasswordContext.name}</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>This instantly overwrites their login password via API. No email will be sent. The user can log in immediately.</p>

                        <input
                            type="text"
                            required
                            placeholder="Type new password..."
                            value={tempPasswordValue}
                            onChange={(e) => setTempPasswordValue(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid var(--border)', borderRadius: '4px' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setTempPasswordContext(null)} className="cta secondary" disabled={isSaving}>Cancel</button>
                            <button type="submit" className="cta primary" disabled={isSaving}>{isSaving ? 'Working...' : 'Force Password'}</button>
                        </div>
                    </form>
                </div>
            )}

            {repairContext && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <form onSubmit={handleRepairLink} className="callout" style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', width: '400px' }}>
                        <h3>Link Auth User to {repairContext.name}</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>If a user exists in Supabase Auth but their `user_id` is missing here, paste the Auth User ID below to manually bind them.</p>

                        <input
                            type="text"
                            placeholder="Paste Auth User ID (UUID) or leave blank to clear"
                            value={repairUserIdInput}
                            onChange={(e) => setRepairUserIdInput(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid var(--border)', borderRadius: '4px' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setRepairContext(null)} className="cta secondary" disabled={isSaving}>Cancel</button>
                            <button type="submit" className="cta primary" disabled={isSaving}>{isSaving ? 'Working...' : 'Update Link'}</button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {crewData.map((row) => {
                    const hasAuthUser = !!row.auth_user;
                    const authEmail = row.auth_user?.email;
                    const isConfirmed = !!row.auth_user?.email_confirmed_at;
                    const lastSignIn = row.auth_user?.last_sign_in_at ? new Date(row.auth_user.last_sign_in_at).toLocaleString() : 'Never';

                    return (
                        <div key={row.employee_id} className="card" style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 2fr', gap: '1rem', alignItems: 'flex-start' }}>

                            {/* LEFT: Employee Identity */}
                            <div>
                                <h3 style={{ margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {row.display_name}
                                    {!row.active && <span className="badge" style={{ fontSize: '0.7rem', background: '#fef2f2', color: '#991b1b' }}>Inactive</span>}
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Employee ID: {row.employee_id.split('-')[0]}...</p>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}><strong>Email:</strong> {row.employee_email || 'None'}</p>

                                <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: '#f8fafc', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                    <strong style={{ fontSize: '0.85rem', color: row.linked_user_id ? '#166534' : '#854d0e' }}>
                                        {row.linked_user_id ? '✓ Mapped exactly' : '⚠️ Missing Map (user_id is null)'}
                                    </strong>
                                    {row.linked_user_id && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--muted)', wordBreak: 'break-all' }}>{row.linked_user_id}</p>}
                                </div>
                            </div>

                            {/* RIGHT: Auth Live Status & Access Controls */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ background: hasAuthUser ? '#f0fdf4' : '#fef2f2', padding: '0.75rem', borderRadius: '8px', border: `1px solid ${hasAuthUser ? '#bbf7d0' : '#fca5a5'}`, fontSize: '0.85rem' }}>
                                    {hasAuthUser ? (
                                        <>
                                            <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600, color: '#166534' }}>Supabase Auth Record Located</p>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', color: '#374151' }}>
                                                <span><strong>Auth Email:</strong> {authEmail}</span>
                                                <span><strong>Email Confirmed:</strong> {isConfirmed ? 'Yes' : 'No'}</span>
                                                <span><strong>Last Sign In:</strong> {lastSignIn}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <p style={{ margin: 0, color: '#991b1b' }}><strong>No corresponding Auth record found.</strong> They have not been invited, or their user_id linkage is broken.</p>
                                    )}
                                </div>

                                {/* ADMIN ACTIONS ROW */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {!hasAuthUser && (
                                        <button
                                            onClick={() => handleSendInvite(row.employee_id, row.employee_email || '')}
                                            className="cta"
                                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                                            disabled={isSaving || !row.employee_email}
                                        >
                                            Send Standard Invite
                                        </button>
                                    )}

                                    {hasAuthUser && (
                                        <>
                                            <button
                                                onClick={() => setTempPasswordContext({ authUserId: row.auth_user.id, name: row.display_name })}
                                                className="cta"
                                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', background: '#e0e7ff', color: '#3730a3', border: '1px solid #bfdbfe' }}
                                                disabled={isSaving}
                                            >
                                                Force Temp Password
                                            </button>

                                            <button
                                                onClick={() => handleSendInvite(row.employee_id, row.auth_user.email)}
                                                className="cta secondary"
                                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                                                disabled={isSaving}
                                            >
                                                Resend Standard Invite
                                            </button>
                                        </>
                                    )}

                                    <div style={{ flex: 1 }}></div>

                                    {/* Advanced DB Actions */}
                                    <button
                                        onClick={() => setRepairContext({ employeeId: row.employee_id, name: row.display_name })}
                                        className="cta secondary"
                                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                                        disabled={isSaving}
                                    >
                                        Manual Link
                                    </button>
                                    {row.linked_user_id && (
                                        <button
                                            onClick={() => handleUnlink(row.employee_id, row.display_name)}
                                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', background: 'transparent', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '4px', cursor: 'pointer' }}
                                            disabled={isSaving}
                                        >
                                            Unlink
                                        </button>
                                    )}
                                </div>
                            </div>

                        </div>
                    )
                })}
            </div>

        </div>
    )
}
