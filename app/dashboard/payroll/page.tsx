import { redirect } from 'next/navigation';
import { getAdjacentPayday, getWeeklyPayrollSummary } from '@/lib/payroll/getWeeklyPayrollSummary';
import { formatPayPeriodLabel, formatPaydayLabel } from '@/lib/payroll/payPeriod';
import { EmployeePayrollTransactions, PayrollRecordPanel } from './PayrollTransactions';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PayrollPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined } }) {
    const searchParams = await Promise.resolve(props.searchParams);
    const paydayParam =
        typeof searchParams?.payday === 'string'
            ? searchParams.payday
            : typeof searchParams?.weekStart === 'string'
                ? searchParams.weekStart
                : undefined;

    const { data: summary, error } = await getWeeklyPayrollSummary(paydayParam);

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
                {error?.includes('payroll_transactions') && (
                    <p className="small" style={{ marginTop: '0.75rem', color: 'var(--muted)' }}>
                        Apply migration <code>019_payroll_transactions.sql</code> in Supabase when ready.
                    </p>
                )}
            </div>
        );
    }

    const prevPayday = getAdjacentPayday(summary.payday, -1);
    const nextPayday = getAdjacentPayday(summary.payday, 1);
    const payPeriodLabel = formatPayPeriodLabel(summary.payPeriodStart, summary.payPeriodEnd);
    const paydayLabel = formatPaydayLabel(summary.payday);

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <Link href={`/dashboard/payroll?payday=${prevPayday}`} className="cta" style={{ padding: '0.4rem 0.8rem', background: '#e5e7eb', color: '#374151', textDecoration: 'none' }}>
                        &larr; Prev Period
                    </Link>
                    <div style={{ fontWeight: 500, background: '#f3f4f6', padding: '0.5rem 0.8rem', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span>Pay period: {payPeriodLabel}</span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>Payday: {paydayLabel}</span>
                    </div>
                    <Link href={`/dashboard/payroll?payday=${nextPayday}`} className="cta" style={{ padding: '0.4rem 0.8rem', background: '#e5e7eb', color: '#374151', textDecoration: 'none' }}>
                        Next Period &rarr;
                    </Link>
                </div>
            </div>

            <PayrollRecordPanel
                payday={summary.payday}
                payPeriodStart={summary.payPeriodStart}
                payPeriodEnd={summary.payPeriodEnd}
                employees={summary.activeEmployees}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.35rem' }}>Total Hours</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{summary.totalHours.toFixed(2)}</div>
                </div>
                <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.35rem' }}>Gross Labor</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#16a34a' }}>{formatCurrency(summary.estimatedPayrollTotal)}</div>
                </div>
                <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.35rem' }}>Additions</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{formatCurrency(summary.totalAdditions)}</div>
                </div>
                <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.35rem' }}>Deductions</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{formatCurrency(summary.totalDeductions)}</div>
                </div>
                <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.35rem' }}>Paid / Advanced</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{formatCurrency(summary.totalPaidAndAdvanced)}</div>
                </div>
                <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.35rem' }}>Net Remaining Owed</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1d4ed8' }}>{formatCurrency(summary.totalNetRemainingOwed)}</div>
                </div>
            </div>

            {summary.openEntries > 0 && (
                <div className="callout" style={{ marginBottom: '2rem', background: '#fef2f2', color: '#991b1b', borderColor: '#f87171' }}>
                    <strong>Warning:</strong> There {summary.openEntries === 1 ? 'is 1 open time entry' : `are ${summary.openEntries} open time entries`} in this period. Open entries are excluded from gross labor until clocked out.
                </div>
            )}

            {summary.employeeSummaries.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: '1.1rem' }}>
                        No time entries or payments recorded for this pay period.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {summary.employeeSummaries.map((emp) => (
                        <div key={emp.employee_id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{emp.display_name}</h3>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                                        {emp.hourly_rate !== null
                                            ? `$${emp.hourly_rate.toFixed(2)}/hr`
                                            : (
                                                <span style={{ color: '#b45309' }}>
                                                    No pay rate set — add a rate in Crew Management to estimate gross labor
                                                </span>
                                            )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                                    <Stat label="Hours" value={emp.total_hours.toFixed(2)} />
                                    <Stat label="Gross labor" value={formatCurrency(emp.estimated_gross_pay)} />
                                    <Stat label="Additions" value={formatCurrency(emp.additions)} />
                                    <Stat label="Deductions" value={formatCurrency(emp.deductions)} />
                                    <Stat label="Paid / advanced" value={formatCurrency(emp.paid_and_advanced)} />
                                    <Stat label="Net owed" value={formatCurrency(emp.net_remaining_owed)} highlight />
                                </div>
                            </div>

                            <EmployeePayrollTransactions
                                employeeId={emp.employee_id}
                                payday={summary.payday}
                                payPeriodStart={summary.payPeriodStart}
                                payPeriodEnd={summary.payPeriodEnd}
                                transactions={emp.transactions}
                                employees={summary.activeEmployees}
                            />

                            {emp.entry_count > 0 && (
                                <details style={{ marginTop: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                                    <summary style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: 500, outline: 'none' }}>
                                        View time entries ({emp.entry_count})
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
                                                {emp.entries.map((entry) => {
                                                    const clockInDate = new Date(entry.clock_in);
                                                    const clockOutDate = entry.clock_out ? new Date(entry.clock_out) : null;
                                                    const timeFormatter = new Intl.DateTimeFormat('en-US', {
                                                        hour: 'numeric',
                                                        minute: '2-digit',
                                                        timeZone: 'America/Chicago'
                                                    });
                                                    const dateFormatter = new Intl.DateTimeFormat('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        timeZone: 'America/Chicago'
                                                    });
                                                    const isRowOpen = entry.clock_out === null;

                                                    return (
                                                        <tr key={entry.id} style={{ borderBottom: '1px solid #e5e7eb', background: isRowOpen ? '#fef2f2' : 'transparent' }}>
                                                            <td style={{ padding: '0.6rem 0' }}>{dateFormatter.format(clockInDate)}</td>
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
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{label}</div>
            <div style={{ fontWeight: 'bold', fontSize: '1rem', color: highlight ? '#1d4ed8' : 'inherit' }}>{value}</div>
        </div>
    );
}
