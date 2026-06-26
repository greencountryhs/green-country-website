import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCrewPaySummary } from '@/lib/payroll/getCrewPaySummary';
import { getAdjacentPayday } from '@/lib/payroll/getWeeklyPayrollSummary';
import { formatPayPeriodLabel, formatPaydayLabel } from '@/lib/payroll/payPeriod';
import { PAYROLL_ENTRY_TYPE_LABELS } from '@/lib/payroll/transactionTypes';
import { PageHeader } from '@/components/dashboard/ops/PageHeader';
import { EmptyState } from '@/components/dashboard/ops/EmptyState';

export const dynamic = 'force-dynamic';

function formatCurrency(amount: number | null) {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default async function MyPayPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}) {
    const searchParams = await Promise.resolve(props.searchParams);
    const paydayParam =
        typeof searchParams?.payday === 'string' ? searchParams.payday : undefined;

    const { data: summary, error } = await getCrewPaySummary(paydayParam);

    if (error === 'Unauthorized') {
        redirect('/login');
    }

    if (error || !summary) {
        return (
            <div>
                <PageHeader title="My Pay Summary" />
                <div className="ops-callout ops-callout--error">{error || 'Unable to load pay summary.'}</div>
            </div>
        );
    }

    const emp = summary.employee;
    const prevPayday = getAdjacentPayday(summary.payday, -1);
    const nextPayday = getAdjacentPayday(summary.payday, 1);
    const payPeriodLabel = formatPayPeriodLabel(summary.payPeriodStart, summary.payPeriodEnd);
    const paydayLabel = formatPaydayLabel(summary.payday);

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

    const additionLines = emp.transactions.filter((tx) =>
        ['reimbursement', 'bonus', 'other'].includes(tx.entry_type)
    );
    const payoutLines = emp.transactions.filter((tx) =>
        ['payment', 'advance', 'daily_pay'].includes(tx.entry_type)
    );

    return (
        <div>
            <PageHeader
                title="My Pay Summary"
                lead={`Pay period ${payPeriodLabel} · Payday ${paydayLabel}`}
                actions={
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <Link href={`/dashboard/my-pay?payday=${prevPayday}`} className="ops-btn ops-btn--secondary" style={{ padding: '0.45rem 0.8rem', minHeight: 38 }}>
                            ← Prev
                        </Link>
                        <Link href={`/dashboard/my-pay?payday=${nextPayday}`} className="ops-btn ops-btn--secondary" style={{ padding: '0.45rem 0.8rem', minHeight: 38 }}>
                            Next →
                        </Link>
                    </div>
                }
            />

            <div className="ops-callout ops-callout--warn" style={{ marginBottom: '1.5rem' }}>
                This is a read-only estimate. Contact Jon if something looks wrong.
            </div>

            {emp.open_entry_count > 0 && (
                <div className="ops-callout ops-callout--error" style={{ marginBottom: '1.5rem' }}>
                    You have {emp.open_entry_count} open time {emp.open_entry_count === 1 ? 'entry' : 'entries'} in this period.
                    Open shifts are not included in gross labor until clocked out.
                </div>
            )}

            <div className="ops-stat-grid" style={{ marginBottom: '2rem' }}>
                <div className="ops-stat">
                    <div className="ops-stat__label">Total hours</div>
                    <div className="ops-stat__value">{emp.total_hours.toFixed(2)}</div>
                </div>
                <div className="ops-stat">
                    <div className="ops-stat__label">Hourly rate</div>
                    <div className="ops-stat__value">
                        {emp.hourly_rate !== null ? formatCurrency(emp.hourly_rate) : 'Not set'}
                    </div>
                </div>
                <div className="ops-stat">
                    <div className="ops-stat__label">Gross labor</div>
                    <div className="ops-stat__value">{formatCurrency(emp.estimated_gross_pay)}</div>
                </div>
                <div className="ops-stat">
                    <div className="ops-stat__label">Additions</div>
                    <div className="ops-stat__value">{formatCurrency(emp.additions)}</div>
                </div>
                <div className="ops-stat">
                    <div className="ops-stat__label">Deductions</div>
                    <div className="ops-stat__value">{formatCurrency(emp.deductions)}</div>
                </div>
                <div className="ops-stat">
                    <div className="ops-stat__label">Paid / advanced</div>
                    <div className="ops-stat__value">{formatCurrency(emp.paid_and_advanced)}</div>
                </div>
                <div className="ops-stat">
                    <div className="ops-stat__label">Est. remaining owed</div>
                    <div className="ops-stat__value" style={{ color: '#1d4ed8' }}>
                        {formatCurrency(emp.net_remaining_owed)}
                    </div>
                </div>
            </div>

            {emp.entry_count === 0 && emp.transactions.length === 0 ? (
                <EmptyState
                    title="No activity this pay period"
                    description="Hours and pay adjustments for this Friday–Thursday period will appear here."
                />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {emp.transactions.length > 0 && (
                        <section className="ops-card">
                            <h2 className="ops-section-title">Payments &amp; adjustments</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {emp.transactions.map((tx) => (
                                    <div
                                        key={tx.id}
                                        style={{
                                            padding: '0.75rem',
                                            background: 'var(--ops-panel)',
                                            borderRadius: '8px',
                                            border: '1px solid var(--ops-border)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                                            <div>
                                                <strong>{PAYROLL_ENTRY_TYPE_LABELS[tx.entry_type]}</strong>
                                                <span style={{ color: 'var(--ops-muted)', marginLeft: '0.5rem' }}>{tx.transaction_date}</span>
                                            </div>
                                            <strong>{formatCurrency(tx.amount_cents / 100)}</strong>
                                        </div>
                                        {tx.note && (
                                            <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--ops-muted)' }}>{tx.note}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {(additionLines.length > 0 || payoutLines.length > 0) && (
                                <p className="ops-section-lead" style={{ marginTop: '1rem', marginBottom: 0 }}>
                                    Additions include reimbursement, bonus, and other adjustments.
                                    Paid / advanced includes payment, daily pay, and advances.
                                </p>
                            )}
                        </section>
                    )}

                    {emp.entry_count > 0 && (
                        <section className="ops-card">
                            <h2 className="ops-section-title">Time entries</h2>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', minWidth: 520 }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--ops-border)', textAlign: 'left', color: 'var(--ops-muted)' }}>
                                            <th style={{ padding: '0.5rem 0' }}>Date</th>
                                            <th style={{ padding: '0.5rem 0' }}>Clock in</th>
                                            <th style={{ padding: '0.5rem 0' }}>Clock out</th>
                                            <th style={{ padding: '0.5rem 0' }}>Hours</th>
                                            <th style={{ padding: '0.5rem 0' }}>Flags</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {emp.entries.map((entry) => {
                                            const clockInDate = new Date(entry.clock_in);
                                            const clockOutDate = entry.clock_out ? new Date(entry.clock_out) : null;
                                            const isOpen = entry.clock_out === null;

                                            return (
                                                <tr key={entry.id} style={{ borderBottom: '1px solid var(--ops-border)', background: isOpen ? '#fdf4f4' : 'transparent' }}>
                                                    <td style={{ padding: '0.6rem 0' }}>{dateFormatter.format(clockInDate)}</td>
                                                    <td style={{ padding: '0.6rem 0' }}>{timeFormatter.format(clockInDate)}</td>
                                                    <td style={{ padding: '0.6rem 0' }}>{clockOutDate ? timeFormatter.format(clockOutDate) : '—'}</td>
                                                    <td style={{ padding: '0.6rem 0' }}>
                                                        {entry.duration_hours !== null ? `${entry.duration_hours.toFixed(2)}h` : '—'}
                                                    </td>
                                                    <td style={{ padding: '0.6rem 0' }}>
                                                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                                            {isOpen && <span className="ops-status ops-status--overdue">Open</span>}
                                                            {entry.manual_entry && <span className="ops-status ops-status--scheduled">Manual</span>}
                                                            {entry.was_edited && <span className="ops-status ops-status--active">Edited</span>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}
