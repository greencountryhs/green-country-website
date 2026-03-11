'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { inviteCrewMemberLogin } from './actions';

type Employee = {
    id: string;
    display_name: string;
    pay_rate_cents: number;
    active: boolean;
    user_id?: string;
    email?: string;
};

export default function EmployeesPage() {
    const supabase = createClient();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [newPayRate, setNewPayRate] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [invitingId, setInvitingId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    const [pageStatus, setPageStatus] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const [inviteInput, setInviteInput] = useState<{ id: string, email: string } | null>(null);

    useEffect(() => {
        fetchEmployees();
    }, []);

    async function fetchEmployees() {
        setLoading(true);
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .order('display_name');

        if (error) {
            console.error('[page.tsx] Error fetching employees:', error);
            setPageStatus({ type: 'error', text: 'Error fetching crew data.' });
        } else {
            setEmployees(data || []);
        }
        setLoading(false);
    }

    async function addEmployee(e: React.FormEvent) {
        e.preventDefault();
        if (isAdding) {
            console.log('[page.tsx] Duplicate addEmployee call dropped.');
            return;
        }
        setIsAdding(true);
        setPageStatus(null);

        let payRateFloat = parseFloat(newPayRate);
        if (isNaN(payRateFloat)) payRateFloat = 0;
        const payRateCents = Math.round(payRateFloat * 100);

        const { data, error } = await supabase
            .from('employees')
            .insert([
                {
                    display_name: newName,
                    pay_rate_cents: payRateCents,
                    email: newEmail || null
                }
            ])
            .select();

        if (error) {
            console.error('[page.tsx] Error adding employee:', error);
            setPageStatus({ type: 'error', text: `Failed to create employee record: ${error.message}` });
        } else if (data) {
            const newEmp = data[0];
            console.log("[page.tsx] Employee inserted successfully:", newEmp);

            // Optimistically update the list BEFORE starting the invite process
            // so the user sees the new employee immediately even if the phone drops the invite HTTP request.
            setEmployees(prev => [...prev, newEmp].sort((a, b) => a.display_name.localeCompare(b.display_name)));
            setNewName('');
            setNewPayRate('');
            setNewEmail('');

            if (newEmail) {
                try {
                    console.log(`[page.tsx] Inviting newly created employee ${newEmail}...`);
                    const res = await inviteCrewMemberLogin(newEmp.id, newEmail);
                    if (res?.error) {
                        setPageStatus({ type: 'error', text: `Employee created, but invite failed: ${res.error}` });
                    } else {
                        // Success update
                        setEmployees(prev => prev.map(emp => emp.id === newEmp.id ? { ...emp, user_id: 'pending', email: newEmail } : emp));
                        setPageStatus({ type: 'success', text: `Employee created and invite sent to ${newEmail}!` });
                    }
                } catch (err: any) {
                    console.error("[page.tsx] Invite trigger threw an exception:", err);
                    setPageStatus({ type: 'error', text: `Employee created, but invite encountered a critical error: ${err.message}` });
                }
            } else {
                setPageStatus({ type: 'success', text: `Employee ${newEmp.display_name} created successfully!` });
            }
        }
        setIsAdding(false);
    }

    async function submitInvite(id: string, email: string) {
        if (!email) {
            setPageStatus({ type: 'error', text: 'Please provide an email address.' });
            return;
        }
        if (invitingId) {
            console.log('[page.tsx] Duplicate submitInvite call dropped.');
            return;
        }

        setPageStatus(null);
        setInvitingId(id);

        try {
            console.log(`[page.tsx] Sending manual invite for employee ${id} to ${email}`);
            const res = await inviteCrewMemberLogin(id, email);
            if (res?.error) {
                setPageStatus({ type: 'error', text: `Invite failed: ${res.error}` });
            } else {
                setPageStatus({ type: 'success', text: `Invite sent successfully to ${email}!` });
                setInviteInput(null);
                setEmployees(prev => prev.map(emp =>
                    emp.id === id ? { ...emp, email, user_id: 'pending' } : emp
                ));
            }
        } catch (err: any) {
            console.error("[page.tsx] Invite threw an exception:", err);
            setPageStatus({ type: 'error', text: `Invite failed: ${err.message}` });
        } finally {
            setInvitingId(null);
        }
    }

    async function toggleActive(id: string, currentStatus: boolean) {
        const { error } = await supabase
            .from('employees')
            .update({ active: !currentStatus })
            .eq('id', id);

        if (error) {
            console.error('[page.tsx] Error updating status:', error);
            setPageStatus({ type: 'error', text: `Failed to update status: ${error.message}` });
        } else {
            setEmployees(prev => prev.map(emp =>
                emp.id === id ? { ...emp, active: !currentStatus } : emp
            ));
        }
    }

    return (
        <div className="page">
            <Link href="/dashboard" className="link small" style={{ marginBottom: '1rem', display: 'inline-block' }}>
                &larr; Back to Dashboard
            </Link>

            <h1>Crew Management</h1>

            {pageStatus && (
                <div style={{ padding: '1rem', marginBottom: '1.5rem', borderRadius: '8px', border: `1px solid ${pageStatus.type === 'error' ? '#fca5a5' : '#86efac'}`, background: pageStatus.type === 'error' ? '#fef2f2' : '#f0fdf4', color: pageStatus.type === 'error' ? '#991b1b' : '#166534', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{pageStatus.text}</span>
                    <button onClick={() => setPageStatus(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'inherit' }}>×</button>
                </div>
            )}

            <div className="callout" style={{ marginBottom: '2rem' }}>
                <h3>Add New Crew Member</h3>
                <form onSubmit={addEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Name</label>
                        <input
                            type="text"
                            required
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '1rem' }}
                            placeholder="e.g. John Doe"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Email (Optional for Login Invite)</label>
                        <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '1rem' }}
                            placeholder="e.g. john@example.com"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Hourly Rate ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={newPayRate}
                            onChange={(e) => setNewPayRate(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '1rem' }}
                            placeholder="e.g. 25.00"
                        />
                    </div>
                    <button type="submit" className="cta" style={{ marginTop: '0.5rem' }} disabled={isAdding}>
                        {isAdding ? 'Adding...' : 'Add Crew Member'}
                    </button>
                </form>
            </div>

            <h2>Current Crew</h2>
            {loading ? (
                <p>Loading crew...</p>
            ) : employees.length === 0 ? (
                <p>No crew members found.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {employees.map(emp => (
                        <div key={emp.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: emp.active ? 1 : 0.6 }}>
                            <div>
                                <Link href={`/dashboard/employees/${emp.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{emp.display_name} <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>&rarr; View Detail</span></h3>
                                </Link>
                                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--muted)' }}>
                                    ${(emp.pay_rate_cents / 100).toFixed(2)} / hr
                                </p>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                                    <span className="badge" style={{ background: emp.active ? '#dcfce7' : '#f3f4f6', color: emp.active ? '#166534' : '#374151', border: 'none' }}>
                                        {emp.active ? 'Active' : 'Inactive'}
                                    </span>
                                    {emp.user_id ? (
                                        <span className="badge" style={{ background: '#dbeafe', color: '#1e3a8a', border: 'none' }}>
                                            Linked Login
                                        </span>
                                    ) : inviteInput?.id === emp.id ? (
                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            <input
                                                type="email"
                                                placeholder="Email to invite"
                                                value={inviteInput.email}
                                                onChange={(e) => setInviteInput({ id: emp.id, email: e.target.value })}
                                                style={{ fontSize: '0.75rem', padding: '0.2rem', border: '1px solid var(--border)', borderRadius: '4px', maxWidth: '140px' }}
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => submitInvite(emp.id, inviteInput.email)}
                                                disabled={invitingId === emp.id}
                                                style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                            >
                                                {invitingId === emp.id ? '...' : 'Send'}
                                            </button>
                                            <button
                                                onClick={() => setInviteInput(null)}
                                                disabled={invitingId === emp.id}
                                                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'transparent', color: 'var(--muted)', border: 'none', cursor: 'pointer' }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setInviteInput({ id: emp.id, email: emp.email || '' })}
                                            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            Send Invite
                                        </button>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => toggleActive(emp.id, emp.active)}
                                className={`cta ${emp.active ? 'secondary' : ''}`}
                                style={{ padding: '0.5rem 1rem' }}
                            >
                                {emp.active ? 'Deactivate' : 'Activate'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
