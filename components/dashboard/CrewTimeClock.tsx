'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ClockOutQuestionnaire } from '@/components/dashboard/ClockOutQuestionnaire';

export function CrewTimeClock({ employeeId }: { employeeId: string }) {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [entryId, setEntryId] = useState<string | null>(null);
    const [clockInTime, setClockInTime] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [showClockOutForm, setShowClockOutForm] = useState(false);

    useEffect(() => {
        fetchStatus();
    }, []);

    async function fetchStatus() {
        setLoading(true);
        const { data, error } = await supabase
            .from('time_entries')
            .select('*')
            .eq('employee_id', employeeId)
            .is('clock_out', null)
            .maybeSingle();

        if (!error && data) {
            setEntryId(data.id);
            setClockInTime(data.clock_in);
        } else {
            setEntryId(null);
            setClockInTime(null);
        }
        setLoading(false);
    }

    async function handleClockIn() {
        setActionMessage(null);
        if (entryId) return;

        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('time_entries')
            .insert([{ employee_id: employeeId, clock_in: now }])
            .select()
            .single();

        if (error) {
            console.error('Error clocking in:', error);
            alert('Failed to clock in');
        } else if (data) {
            setEntryId(data.id);
            setClockInTime(data.clock_in);
            // Match Time Tracking page: redirect non-admins to Today's Tasks after clock-in
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                if (profile?.role !== 'admin') {
                    window.location.href = '/dashboard/tasks';
                }
            }
        }
    }

    function formatTime(isoString: string) {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (loading) {
        return <div className="card"><p>Loading time clock...</p></div>;
    }

    const isWorking = entryId !== null;

    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Time Clock</h3>
                <span className="badge" style={{
                    background: isWorking ? '#dcfce7' : '#f3f4f6',
                    color: isWorking ? '#166534' : '#374151',
                    border: 'none',
                    fontSize: '0.9rem',
                    padding: '0.3rem 0.6rem'
                }}>
                    {isWorking ? 'Clocked In' : 'Not Working'}
                </span>
            </div>

            {isWorking && clockInTime && (
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
                    Clocked in at {formatTime(clockInTime)}
                </p>
            )}

            <div style={{ marginTop: '0.5rem' }}>
                {isWorking ? (
                    showClockOutForm && entryId ? (
                        <ClockOutQuestionnaire
                            entryId={entryId}
                            onCancel={() => setShowClockOutForm(false)}
                            onSuccess={() => {
                                setShowClockOutForm(false);
                                setEntryId(null);
                                setClockInTime(null);
                            }}
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                setActionMessage(null);
                                setShowClockOutForm(true);
                            }}
                            className="cta"
                            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', background: '#dc2626' }}
                        >
                            Clock Out
                        </button>
                    )
                ) : (
                    <button
                        onClick={handleClockIn}
                        className="cta"
                        style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', background: '#16a34a' }}
                    >
                        Clock In
                    </button>
                )}
            </div>
        </div>
    );
}
