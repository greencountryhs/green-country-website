'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { ClockOutQuestionnaire } from '@/components/dashboard/ClockOutQuestionnaire';
import { PageHeader } from '@/components/dashboard/ops/PageHeader';
import { StatusBadge } from '@/components/dashboard/ops/StatusBadge';
import {
    bulkClockInTimeEntries,
    bulkClockOutTimeEntries,
    clockInTimeEntry,
    clockOutTimeEntry
} from '@/lib/time/actions';

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
    const [actionError, setActionError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [selfClockOutForm, setSelfClockOutForm] = useState<{ employeeId: string; entryId: string } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        setActionMessage(null);
        setActionError(null);

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
        setActionError(null);
        const inactiveEmps = employees.filter(emp => emp.current_entry_id === null);
        const activeCount = employees.length - inactiveEmps.length;

        if (inactiveEmps.length === 0) {
            setActionMessage(`Clocked in 0 employees, skipped ${activeCount} already active`);
            return;
        }

        try {
            const result = await bulkClockInTimeEntries(inactiveEmps.map((emp) => emp.id));
            if (result.error) {
                setActionError(result.error);
            }
            setActionMessage(
                `Clocked in ${result.clockedIn} employees, skipped ${result.skipped + activeCount} already active or blocked`
            );
            fetchData();
        } catch (error) {
            console.error('Error in Start Day:', error);
            setActionError('An unexpected error occurred during bulk clock-in.');
        }
    }

    async function handleEndDay() {
        setActionMessage(null);
        setActionError(null);
        const activeEmps = employees.filter(emp => emp.current_entry_id !== null);
        const inactiveCount = employees.length - activeEmps.length;

        if (activeEmps.length === 0) {
            setActionMessage(`Clocked out 0 employees, skipped ${inactiveCount} not active`);
            return;
        }

        try {
            const result = await bulkClockOutTimeEntries(activeEmps.map((e) => e.current_entry_id!));
            if (result.error) {
                setActionError(result.error);
            }
            setActionMessage(
                `Clocked out ${result.clockedOut} employees, skipped ${result.skipped + inactiveCount} not active or blocked`
            );
            fetchData();
        } catch (error) {
            console.error('Error in End Day:', error);
            setActionError('An unexpected error occurred during bulk clock-out.');
        }
    }

    async function handleClockIn(employeeId: string) {
        setActionMessage(null);
        setActionError(null);

        const employee = employees.find(emp => emp.id === employeeId);
        if (employee && employee.current_entry_id !== null) {
            console.warn('Employee is already clocked in:', employeeId);
            return;
        }

        try {
            const result = await clockInTimeEntry(employeeId);
        if (result.ok === false) {
            setActionError(result.error);
            return;
        }
            setEmployees(employees.map(emp =>
                emp.id === employeeId
                    ? { ...emp, current_entry_id: result.data.id, clock_in_time: result.data.clock_in }
                    : emp
            ));

            if (role !== 'admin') {
                window.location.href = '/dashboard/tasks';
            }
        } catch (error) {
            console.error('Error clocking in:', error);
            setActionError('An unexpected error occurred while clocking in.');
        }
    }

    async function handleClockOut(employeeId: string, entryId: string) {
        setActionMessage(null);
        setActionError(null);
        try {
            const result = await clockOutTimeEntry(entryId);
        if (result.ok === false) {
            setActionError(result.error);
            return;
        }
            setEmployees(employees.map(emp =>
                emp.id === employeeId
                    ? { ...emp, current_entry_id: null, clock_in_time: null }
                    : emp
            ));
        } catch (error) {
            console.error('Error clocking out:', error);
            setActionError('An unexpected error occurred while clocking out.');
        }
    }

    function formatTime(isoString: string) {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return (
        <div>
            <PageHeader
                title="Time Tracking"
                lead="Clock crew in or out individually, or use bulk actions for start/end of day."
                actions={role ? (
                    <span className="ops-status ops-status--scheduled" style={{ textTransform: 'none' }}>
                        Role: {role}
                    </span>
                ) : undefined}
            />

            {role === 'admin' && (
                <div className="ops-card ops-card--flat" style={{ marginBottom: '1.5rem' }}>
                    <h2 className="ops-section-title">Bulk actions</h2>
                    <p className="ops-section-lead">
                        Quickly clock in all inactive crew, or clock out all active crew at once.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button type="button" onClick={handleStartDay} className="ops-btn ops-btn--success" style={{ flex: 1, minWidth: 160 }}>
                            Bulk clock in all
                        </button>
                        <button type="button" onClick={handleEndDay} className="ops-btn ops-btn--destructive" style={{ flex: 1, minWidth: 160 }}>
                            Bulk clock out all
                        </button>
                    </div>
                </div>
            )}

            <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--ops-border)', paddingTop: '1.25rem' }}>
                <h2 className="ops-section-title">Individual actions</h2>
                <p className="ops-section-lead">Select a crew member below to clock them in or out.</p>

            {actionError && (
                <div className="ops-callout ops-callout--error" style={{ marginBottom: '1rem' }} role="alert">
                    {actionError}
                </div>
            )}

            {actionMessage && (
                <div className="ops-callout ops-callout--info" style={{ marginBottom: '1rem' }}>
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
                            <div key={emp.id} className="ops-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                                    <StatusBadge
                                        variant={isWorking ? 'clocked-in' : 'off'}
                                        label={isWorking ? 'Clocked in' : 'Not working'}
                                    />
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
                                                onError={(message) => setActionError(message)}
                                                onSuccess={() => {
                                                    setSelfClockOutForm(null);
                                                    setActionError(null);
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
                                                className="ops-btn ops-btn--destructive ops-btn--block"
                                            >
                                                Clock Out
                                            </button>
                                        )
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleClockIn(emp.id)}
                                            className="ops-btn ops-btn--success ops-btn--block"
                                        >
                                            Clock in
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
