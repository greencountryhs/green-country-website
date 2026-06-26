import {
    TIME_CLOCK_EVENT_LABELS,
    TIME_CLOCK_SOURCE_LABELS,
    type TimeClockEventRecord,
    type TimeClockEventType
} from '@/lib/time/clockEvents';

function formatEventTime(iso: string) {
    return new Date(iso).toLocaleString('en-US', {
        timeZone: 'America/Chicago',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function eventTone(eventType: TimeClockEventType): string {
    if (eventType.endsWith('_success')) return 'ops-status--completed';
    if (eventType.endsWith('_failed')) return 'ops-status--overdue';
    return 'ops-status--scheduled';
}

export function ClockEventHistory({
    events,
    showEmployee = true
}: {
    events: TimeClockEventRecord[];
    showEmployee?: boolean;
}) {
    if (events.length === 0) {
        return (
            <p style={{ margin: 0, color: 'var(--ops-muted)', fontSize: '0.9rem' }}>
                No clock events recorded yet. Events appear after migration 020 is applied and crew or admin use the time clock.
            </p>
        );
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: 640 }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid var(--ops-border)', textAlign: 'left', color: 'var(--ops-muted)' }}>
                        <th style={{ padding: '0.5rem' }}>When</th>
                        {showEmployee && <th style={{ padding: '0.5rem' }}>Employee</th>}
                        <th style={{ padding: '0.5rem' }}>Event</th>
                        <th style={{ padding: '0.5rem' }}>Source</th>
                        <th style={{ padding: '0.5rem' }}>Details</th>
                    </tr>
                </thead>
                <tbody>
                    {events.map((event) => (
                        <tr key={event.id} style={{ borderBottom: '1px solid var(--ops-border)' }}>
                            <td style={{ padding: '0.55rem 0.5rem', whiteSpace: 'nowrap' }}>
                                {formatEventTime(event.created_at)}
                            </td>
                            {showEmployee && (
                                <td style={{ padding: '0.55rem 0.5rem' }}>
                                    {event.employees?.display_name ?? event.employee_id.slice(0, 8)}
                                </td>
                            )}
                            <td style={{ padding: '0.55rem 0.5rem' }}>
                                <span className={`ops-status ${eventTone(event.event_type)}`}>
                                    {TIME_CLOCK_EVENT_LABELS[event.event_type]}
                                </span>
                            </td>
                            <td style={{ padding: '0.55rem 0.5rem', color: 'var(--ops-muted)' }}>
                                {event.source ? TIME_CLOCK_SOURCE_LABELS[event.source] : '—'}
                            </td>
                            <td style={{ padding: '0.55rem 0.5rem', color: 'var(--ops-muted)', maxWidth: 280 }}>
                                {event.error_message ? (
                                    <span style={{ color: '#9b2c2c' }}>{event.error_message}</span>
                                ) : event.time_entry_id ? (
                                    <span style={{ fontSize: '0.8rem' }}>Entry {event.time_entry_id.slice(0, 8)}…</span>
                                ) : (
                                    '—'
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
