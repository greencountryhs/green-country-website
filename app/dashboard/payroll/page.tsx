import { redirect } from 'next/navigation';
import { getWeeklyPayrollSummary } from '@/lib/payroll/getWeeklyPayrollSummary';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PayrollPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined } }) {
    const searchParams = await Promise.resolve(props.searchParams);
    const weekStartParam = typeof searchParams?.weekStart === 'string' ? searchParams.weekStart : undefined;

    const { data: summary, error } = await getWeeklyPayrollSummary(weekStartParam);

    if (error === 'Unauthorized') {
        redirect('/login');
    }

    if (error || !summary) {
        return (
            <div className="page">
                <Link href="/dashboard" className="link small" style={{ marginBottom: '1rem', display: 'inline-block' }}>&larr; Back to Dashboard</Link>
                <h1>Error Loading Payroll</h1>
                <p className="callout" style={{ background: '#fef2f2', color: '#991b1b', borderColor: '#f87171' }}>
                    {error || 'An unknown error occurred while fetching payroll data.'}
                </p>
            </div>
        );
    }

    const currentWeekStart = new Date(summary.weekStart + 'T12:00:00Z');

    const prevWeek = new Date(currentWeekStart);
    prevWeek.setDate(prevWeek.getDate() - 7);
    const prevWeekStr = `${prevWeek.getFullYear()}-${String(prevWeek.getMonth() + 1).padStart(2, '0')}-${String(prevWeek.getDate()).padStart(2, '0')}`;

    const nextWeek = new Date(currentWeekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`;

    const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    const weekStartLabel = dateFormatter.format(currentWeekStart);

    const weekEndDisplay = new Date(summary.weekEndInclusive + 'T12:00:00Z');
    const weekEndLabel = dateFormatter.format(weekEndDisplay);

    function formatCurrency(amount: number | null) {
        if (amount === null) return 'N/A';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    }

    return (
        <div className="page">
            <Link href="/dashboard" className="link small" style={{ marginBottom: '1rem', display: 'inline-block' }}>
                &larr; Back to Dashboard
            </Link>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0 }}>Payroll Summary</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link href={`/dashboard/payroll?weekStart=${prevWeekStr}`} className="cta" style={{ padding: '0.4rem 0.8rem', background: '#e5e7eb', color: '#374151', textDecoration: 'none' }}>
                        &larr; Prev Week
                    </Link>
                    <span style={{ fontWeight: 500, background: '#f3f4f6', padding: '0.4rem 0.8rem', borderRadius: '4px' }}>
                        {weekStartLabel} - {weekEndLabel}
                    </span>
                    <Link href={`/dashboard/payroll?weekStart=${nextWeekStr}`} className="cta" style={{ padding: '0.4rem 0.8rem', background: '#e5e7eb', color: '#374151', textDecoration: 'none' }}>
                        Next Week &rarr;
                    </Link>
                </div>
            </div>

            {/* Top Level Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Total Hours</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{summary.totalHours.toFixed(2)}</div>
                </div>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Employees with Hours</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{summary.employeesWithHours}</div>
                </div>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderColor: summary.openEntries > 0 ? '#fca5a5' : undefined }}>
                    <div style={{ fontSize: '0.9rem', color: summary.openEntries > 0 ? '#dc2626' : 'var(--muted)', marginBottom: '0.5rem' }}>Open Entries</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: summary.openEntries > 0 ? '#dc2626' : 'inherit' }}>
                        {summary.openEntries}
                    </div>
                </div>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Est. Total Payroll</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>{formatCurrency(summary.estimatedPayrollTotal)}</div>
                </div>
            </div>

            {summary.openEntries > 0 && (
                <div className="callout" style={{ marginBottom: '2rem', background: '#fef2f2', color: '#991b1b', borderColor: '#f87171' }}>
                    <strong>Warning:</strong> There {summary.openEntries === 1 ? 'is 1 open time entry' : `are ${summary.openEntries} open time entries`} in this period. Open entries are excluded from total hours and estimated pay calculations until they are clocked out.
                </div>
            )}

            {summary.employeeSummaries.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: '1.1rem' }}>No time entries found for this week.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {summary.employeeSummaries.map(emp => (
                        <div key={emp.employee_id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{emp.display_name}</h3>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                                        {emp.hourly_rate !== null ? `$${emp.hourly_rate.toFixed(2)}/hr` : 'No rate set (set in DB to compute pay)'}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Hours</div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{emp.total_hours.toFixed(2)}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Entries</div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                            {emp.entry_count} {emp.open_entry_count > 0 && <span style={{ color: '#dc2626', fontSize: '0.9rem' }}>({emp.open_entry_count} open)</span>}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Est. Pay</div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{formatCurrency(emp.estimated_gross_pay)}</div>
                                    </div>
                                </div>
                            </div>

                            <details style={{ marginTop: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                                <summary style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: 500, outline: 'none' }}>
                                    View Entry Details ({emp.entry_count})
                                </summary>
                                <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left', minWidth: '500px' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                                <th style={{ padding: '0.5rem 0', color: 'var(--muted)', fontWeight: 500 }}>Date</th>
                                                <th style={{ padding: '0.5rem 0', color: 'var(--muted)', fontWeight: 500 }}>Clock In</th>
                                                <th style={{ padding: '0.5rem 0', color: 'var(--muted)', fontWeight: 500 }}>Clock Out</th>
                                                <th style={{ padding: '0.5rem 0', color: 'var(--muted)', fontWeight: 500 }}>Duration</th>
                                                <th style={{ padding: '0.5rem 0', color: 'var(--muted)', fontWeight: 500 }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {emp.entries.map(entry => {
                                                const clockInDate = new Date(entry.clock_in);
                                                const clockOutDate = entry.clock_out ? new Date(entry.clock_out) : null;
                                                const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
                                                const isRowOpen = entry.clock_out === null;

                                                return (
                                                    <tr key={entry.id} style={{ borderBottom: '1px solid #e5e7eb', background: isRowOpen ? '#fef2f2' : 'transparent' }}>
                                                        <td style={{ padding: '0.6rem 0' }}>{clockInDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                                                        <td style={{ padding: '0.6rem 0' }}>{timeFormatter.format(clockInDate)}</td>
                                                        <td style={{ padding: '0.6rem 0' }}>{clockOutDate ? timeFormatter.format(clockOutDate) : '-'}</td>
                                                        <td style={{ padding: '0.6rem 0', fontWeight: isRowOpen ? 'normal' : 500 }}>
                                                            {entry.duration_hours !== null ? entry.duration_hours.toFixed(2) + 'h' : '-'}
                                                        </td>
                                                        <td style={{ padding: '0.6rem 0' }}>
                                                            {isRowOpen ? (
                                                                <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: '#fee2e2', borderRadius: '4px' }}>OPEN</span>
                                                            ) : (
                                                                <span style={{ color: '#16a34a', fontSize: '0.8rem' }}>Complete</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </details>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
