'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { clockInTimeEntry } from '@/lib/time/actions';

import { StatusBadge } from '@/components/dashboard/ops/StatusBadge';

const errorBannerStyle = {
    background: '#fdf4f4',
    color: '#7f1d1d',
    borderColor: '#e8b4b4',
    marginBottom: '0.75rem'
} as const;
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

        try {
            const result = await clockInTimeEntry(employeeId);
            if (result.ok === false) {
                setActionMessage(result.error);
                return;
            }
            setEntryId(result.data.id);
            setClockInTime(result.data.clock_in);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                if (profile?.role !== 'admin') {
                    window.location.href = '/dashboard/tasks';
                }
            }
        } catch (error) {
            console.error('Error clocking in:', error);
            setActionMessage('An unexpected error occurred while clocking in.');
        }
    }

    function formatTime(isoString: string) {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (loading) {
        return <div className="ops-card"><p>Loading time clock…</p></div>;
    }

    const isWorking = entryId !== null;

    return (
        <div className="ops-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Time Clock</h3>
                <StatusBadge
                    variant={isWorking ? 'clocked-in' : 'off'}
                    label={isWorking ? 'Clocked in' : 'Not working'}
                />
            </div>

            {isWorking && clockInTime && (
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
                    Clocked in at {formatTime(clockInTime)}
                </p>
            )}

            {actionMessage && (
                <div className="ops-callout ops-callout--error" style={errorBannerStyle} role="alert">
                    {actionMessage}
                </div>
            )}

            <div style={{ marginTop: '0.5rem' }}>
                {isWorking ? (
                    showClockOutForm && entryId ? (
                        <ClockOutQuestionnaire
                            entryId={entryId}
                            onCancel={() => setShowClockOutForm(false)}
                            onError={(message) => setActionMessage(message)}
                            onSuccess={() => {
                                setShowClockOutForm(false);
                                setActionMessage(null);
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
                            className="ops-btn ops-btn--destructive ops-btn--block"
                        >
                            Clock Out
                        </button>
                    )
                ) : (
                    <button
                        onClick={handleClockIn}
                        className="ops-btn ops-btn--success ops-btn--block"
                    >
                        Clock In
                    </button>
                )}
            </div>
        </div>
    );
}
