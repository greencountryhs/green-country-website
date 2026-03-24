'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { ClockOutQuestionnaire } from '@/components/dashboard/ClockOutQuestionnaire';

type Employee = {
    id: string;
    display_name: string;
    pay_rate_cents: number;
    active: boolean;
    user_id: string | null;
};

type TimeEntry = {
    id: string;
    employee_id: string;
    clock_in: string;
    clock_out: string | null;
};

type CombinedData = Employee & {
    current_entry_id: string | null;
    clock_in_time: string | null;
};

/** Match DB check constraint + avoid bulk/UI drift from stray casing or whitespace */
function normalizeProfileRole(raw: string | null | undefined): 'admin' | 'employee' {
    const r = (raw ?? 'employee').toString().trim().toLowerCase();
    return r === 'admin' ? 'admin' : 'employee';
}

export default function TimeTrackingPage() {
    const supabase = createClient();
    const [employees, setEmployees] = useState<CombinedData[]>([]);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [selfClockOutForm, setSelfClockOutForm] = useState<{ employeeId: string; entryId: string } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        setActionMessage(null);

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.error('Error fetching user:', authError);
            setLoading(false);
            return;
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) {
            console.error('Error fetching profile for time page:', profileError);
        }

        const userRole = normalizeProfileRole(profile?.role);
        setRole(userRole);
        setCurrentUserId(user.id);

        // Fetch employees
        let empQuery = supabase.from('employees').select('*').eq('active', true).order('display_name');
        if (userRole === 'employee') {
            empQuery = empQuery.eq('user_id', user.id);
        }

        const { data: empData, error: empError } = await empQuery;

        if (empError) {
            console.error('Error fetching employees:', empError);
            setLoading(false);
            return;
        }

        // Fetch open time entries
        const { data: timeData, error: timeError } = await supabase
            .from('time_entries')
            .select('*')
            .is('clock_out', null);

        if (timeError) {
            console.error('Error fetching time entries:', timeError);
            setLoading(false);
            return;
        }

        // Combine data
        const combined: CombinedData[] = (empData || []).map((emp: any) => {
            const entry = (timeData || []).find(t => t.employee_id === emp.id);
            return {
                ...emp,
                current_entry_id: entry ? entry.id : null,
                clock_in_time: entry ? entry.clock_in : null
            };
        });

        setEmployees(combined);
        setLoading(false);
    }

    async function handleStartDay() {
        setActionMessage(null);
        const inactiveEmps = employees.filter(emp => emp.current_entry_id === null);
        const activeCount = employees.length - inactiveEmps.length;

        if (inactiveEmps.length === 0) {
            setActionMessage(`Clocked in 0 employees, skipped ${activeCount} already active`);
            return;
        }

        const now = new Date().toISOString();
        const inserts = inactiveEmps.map(emp => ({ employee_id: emp.id, clock_in: now }));

        const { error } = await supabase
            .from('time_entries')
            .insert(inserts);

        if (error) {
            console.error('Error in Start Day:', error);
            alert('Failed to start day');
        } else {
            setActionMessage(`Clocked in ${inactiveEmps.length} employees, skipped ${activeCount} already active`);
            fetchData();
        }
    }

    async function handleEndDay() {
        setActionMessage(null);
        const activeEmps = employees.filter(emp => emp.current_entry_id !== null);
        const inactiveCount = employees.length - activeEmps.length;

        if (activeEmps.length === 0) {
            setActionMessage(`Clocked out 0 employees, skipped ${inactiveCount} not active`);
            return;
        }

        const now = new Date().toISOString();
        const entryIds = activeEmps.map(e => e.current_entry_id!);

        const { error } = await supabase
            .from('time_entries')
            .update({ clock_out: now })
            .in('id', entryIds);

        if (error) {
            console.error('Error in End Day:', error);
            alert('Failed to end day');
        } else {
            setActionMessage(`Clocked out ${activeEmps.length} employees, skipped ${inactiveCount} not active`);
            fetchData();
        }
    }

    async function handleClockIn(employeeId: string) {
        setActionMessage(null);

        // Prevent duplicate clock-ins
        const employee = employees.find(emp => emp.id === employeeId);
        if (employee && employee.current_entry_id !== null) {
            console.warn('Employee is already clocked in:', employeeId);
            return;
        }

        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('time_entries')
            .insert([{ employee_id: employeeId, clock_in: now }])
            .select();

        if (error) {
            console.error('Error clocking in:', error);
            alert('Failed to clock in');
        } else if (data && data.length > 0) {
            setEmployees(employees.map(emp =>
                emp.id === employeeId
                    ? { ...emp, current_entry_id: data[0].id, clock_in_time: data[0].clock_in }
                    : emp
            ));

            // Redirect straight to tasks
            if (role !== 'admin') {
                window.location.href = '/dashboard/tasks';
            }
        }
    }

    async function handleClockOut(employeeId: string, entryId: string) {
        setActionMessage(null);
        const now = new Date().toISOString();
        const { error } = await supabase
            .from('time_entries')
            .update({ clock_out: now })
            .eq('id', entryId);

        if (error) {
            console.error('Error clocking out:', error);
            alert('Failed to clock out');
        } else {
            setEmployees(employees.map(emp =>
                emp.id === employeeId
                    ? { ...emp, current_entry_id: null, clock_in_time: null }
                    : emp
            ));
        }
    }

    function formatTime(isoString: string) {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return (
        <div className="page">
            <Link href="/dashboard" className="link small" style={{ marginBottom: '1rem', display: 'inline-block' }}>
                &larr; Back to Dashboard
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <h1 style={{ margin: 0 }}>Time Tracking</h1>
                {role && (
                    <span style={{ fontSize: '0.9rem', color: 'var(--muted)', background: '#f3f4f6', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                        Detected role: {role}
                    </span>
                )}
            </div>

            {role === 'admin' && (
                <div style={{ marginBottom: '2rem' }}>
                    <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Bulk Actions</p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '1rem' }}>
                        Use these to quickly clock in all inactive crew, or clock out all active crew at once.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <button onClick={handleStartDay} className="cta" style={{ flex: 1, padding: '1rem', fontSize: '1.1rem', background: '#16a34a' }}>
                            Bulk Clock In All
                        </button>
                        <button onClick={handleEndDay} className="cta" style={{ flex: 1, padding: '1rem', fontSize: '1.1rem', background: '#dc2626' }}>
                            Bulk Clock Out All
                        </button>
                    </div>
                </div>
            )}

            <div style={{ marginTop: '2rem', borderTop: '2px solid var(--border)', paddingTop: '1.5rem' }}>
                <p className="section-lead" style={{ marginBottom: '1.5rem' }}>
                    Individual Actions: Select a crew member below to clock them in or out individually.
                </p>

            {actionMessage && (
                <div className="callout" style={{ marginBottom: '2rem', background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}>
                    {actionMessage}
                </div>
            )}

            {loading ? (
                <p>Loading...</p>
            ) : employees.length === 0 ? (
                <p>{role === 'admin' ? 'No active crew members found. Please add or activate them in the Crew Management section.' : 'No active crew profile linked to your account. Please contact an admin.'}</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {employees.map(emp => {
                        const isWorking = emp.current_entry_id !== null;
                        return (
                            <div key={emp.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.4rem' }}>
                                            <Link href={`/dashboard/reports?employeeId=${emp.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                {emp.display_name}
                                            </Link>
                                        </h3>
                                        {isWorking && (
                                            <Link href={`/dashboard/reports?employeeId=${emp.id}`} className="link small" style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                                                ✎ Edit
                                            </Link>
                                        )}
                                    </div>
                                    <span className="badge" style={{
                                        background: isWorking ? '#dcfce7' : '#f3f4f6',
                                        color: isWorking ? '#166534' : '#374151',
                                        border: 'none',
                                        fontSize: '1rem',
                                        padding: '0.4rem 0.8rem'
                                    }}>
                                        {isWorking ? 'Clocked In' : 'Not Working'}
                                    </span>
                                </div>

                                {isWorking && emp.clock_in_time && (
                                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
                                        Clocked in at {formatTime(emp.clock_in_time)}
                                    </p>
                                )}

                                <div style={{ marginTop: '0.5rem' }}>
                                    {isWorking ? (
                                        selfClockOutForm?.employeeId === emp.id ? (
                                            <ClockOutQuestionnaire
                                                entryId={selfClockOutForm.entryId}
                                                onCancel={() => setSelfClockOutForm(null)}
                                                onSuccess={() => {
                                                    setSelfClockOutForm(null);
                                                    setEmployees((prev) =>
                                                        prev.map((e) =>
                                                            e.id === emp.id
                                                                ? { ...e, current_entry_id: null, clock_in_time: null }
                                                                : e
                                                        )
                                                    );
                                                }}
                                            />
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const isSelf =
                                                        !!currentUserId && emp.user_id === currentUserId;
                                                    if (isSelf) {
                                                        setSelfClockOutForm({
                                                            employeeId: emp.id,
                                                            entryId: emp.current_entry_id!
                                                        });
                                                    } else {
                                                        handleClockOut(emp.id, emp.current_entry_id!);
                                                    }
                                                }}
                                                className="cta"
                                                style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', background: '#dc2626' }}
                                            >
                                                Clock Out
                                            </button>
                                        )
                                    ) : (
                                        <button
                                            onClick={() => handleClockIn(emp.id)}
                                            className="cta"
                                            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', background: '#16a34a' }}
                                        >
                                            Clock In
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            </div>
        </div>
    );
}
