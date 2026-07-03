import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CAPABILITIES } from '@/lib/auth/capabilities'
import { requireCapability } from '@/lib/auth/requireCapability'
import { getMissingClockOuts, getRecentTimeEntries, getWeeklyHoursReport } from '@/lib/reports'
import { getRecentClockEvents } from '@/lib/time/getClockEvents'
import { ClockEventHistory } from '@/components/dashboard/ClockEventHistory'
import { EditTimeEntryForm, CreateManualEntryForm } from './ReportActions'
import { PageHeader } from '@/components/dashboard/ops/PageHeader'
import { ReportsSectionFallback, safeReportsSection } from './ReportsSectionFallback'

export default async function ReportsDashboardPage({ searchParams }: { searchParams: { employeeId?: string, startDate?: string, endDate?: string } }) {
    const isAuthorized = await requireCapability(CAPABILITIES.VIEW_TIME_REPORTS)
    if (!isAuthorized) {
        redirect('/dashboard')
    }

    const { employeeId, startDate, endDate } = searchParams

    const supabase = await createClient()
    const { data: employees } = await supabase.from('employees').select('id, display_name').eq('active', true)

    const filters = { employeeId, startDate, endDate }

    const weeklyResult = await safeReportsSection('weekly hours', () => getWeeklyHoursReport(filters), [])
    const missingResult = await safeReportsSection('missing clock-outs', () => getMissingClockOuts(filters), [])
    const recentResult = await safeReportsSection('recent time entries', () => getRecentTimeEntries(50, filters), [])
    const clockEventsResult = await safeReportsSection('clock events', () => getRecentClockEvents({
        employeeId: employeeId || undefined,
        limit: 50
    }), [])

    const weeklyHours = weeklyResult.data
    const missingClockOuts = missingResult.data
    const recentEntries = recentResult.data
    const clockEvents = clockEventsResult.data

    function formatTimeDisplay(isoString: string) {
        return new Date(isoString).toLocaleString([], {
            timeZone: 'America/Chicago',
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })
    }

    // Default values for datetime-local using strictly the 'America/Chicago' offset
    function toLocalIsoString(isoString: string) {
        try {
            const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Chicago',
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', hour12: false
            });
            const parts = formatter.formatToParts(new Date(isoString));
            const y = parts.find(p => p.type === 'year')?.value;
            const m = parts.find(p => p.type === 'month')?.value;
            const d = parts.find(p => p.type === 'day')?.value;
            const h = parts.find(p => p.type === 'hour')?.value;
            const min = parts.find(p => p.type === 'minute')?.value;
            if(!y || !m || !d || !h || !min) return "";
            return `${y}-${m}-${d}T${h === '24' ? '00' : h}:${min}`;
        } catch (e) {
            return ""
        }
    }

    return (
        <div>
            <PageHeader
                title="Operational Time Reports"
                lead="Add or correct crew time entries below. Use filters to narrow the list, then Edit / Delete on any row. Financial payroll is on the Payroll page."
            />

            {/* FILTERS */}
            <div className="ops-card ops-card--flat" style={{ marginBottom: '1.5rem' }}>
                <form method="GET" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 500 }}>Crew Member</label>
                        <select name="employeeId" defaultValue={employeeId || ''} style={{ padding: '0.5rem', borderRadius: '4px' }}>
                            <option value="">All Crew</option>
                            {employees?.map(e => <option key={e.id} value={e.id}>{e.display_name}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 500 }}>Start Date</label>
                        <input type="date" name="startDate" defaultValue={startDate || ''} style={{ padding: '0.5rem', borderRadius: '4px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 500 }}>End Date</label>
                        <input type="date" name="endDate" defaultValue={endDate || ''} style={{ padding: '0.5rem', borderRadius: '4px' }} />
                    </div>
                    <button type="submit" className="ops-btn ops-btn--primary" style={{ padding: '0.5rem 1rem', minHeight: 40 }}>Apply filters</button>
                    {(employeeId || startDate || endDate) && (
                        <Link href="/dashboard/reports" className="link small" style={{ marginLeft: '1rem' }}>Clear</Link>
                    )}
                </form>
            </div>

            <div style={{ display: 'grid', gap: '2rem' }}>

                {/* MANUAL ENTRY — prominent admin corrections */}
                <section id="add-manual-entry" className="ops-card">
                    <h2 className="ops-section-title">Add manual time entry</h2>
                    <p className="ops-section-lead">
                        Admin only. Use this when crew forgot to clock in/out or you need a missing shift recorded.
                        Overlapping or duplicate entries will show an inline error.
                    </p>
                    <CreateManualEntryForm employees={employees?.map(e => ({ id: e.id, name: e.display_name })) || []} />
                </section>

                {/* RECENT ENTRIES — edit/delete per row */}
                <div className="ops-card" id="recent-time-entries">
                    <h3 className="ops-section-title">Recent time entries</h3>
                    {recentResult.error ? (
                        <ReportsSectionFallback title="Recent time entries unavailable" message={recentResult.error} />
                    ) : (
                    <>
                    <p className="ops-section-lead" style={{ marginBottom: '1rem' }}>
                        Click <strong>Edit / Delete</strong> in the Corrections column to fix or remove a row.
                    </p>
                    {recentEntries.length === 0 ? (
                        <p style={{ fontSize: '0.9rem', color: 'var(--ops-muted)' }}>No entries match the current filters.</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--ops-border)', textAlign: 'left', color: 'var(--ops-muted)' }}>
                                    <th style={{ padding: '0.5rem' }}>Crew member</th>
                                    <th style={{ padding: '0.5rem' }}>Date</th>
                                    <th style={{ padding: '0.5rem' }}>In / out</th>
                                    <th style={{ padding: '0.5rem' }}>Dur (hr)</th>
                                    <th style={{ padding: '0.5rem' }}>Flags</th>
                                    <th style={{ padding: '0.5rem' }}>Clock-out Q</th>
                                    <th style={{ padding: '0.5rem' }}>Corrections</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentEntries.map((t: any) => (
                                    <tr key={t.id} style={{ borderBottom: '1px solid var(--ops-border)' }}>
                                        <td style={{ padding: '0.5rem', fontWeight: 500 }}>
                                            <Link href={`/dashboard/employees/${t.employee_id}`} style={{ color: 'var(--ops-accent-hover)', textDecoration: 'none' }}>
                                                {t.employee_name}
                                            </Link>
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>{t.work_date}</td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <div>{formatTimeDisplay(t.clock_in)}</div>
                                            {t.clock_out ? <div style={{ color: 'var(--ops-muted)' }}>{formatTimeDisplay(t.clock_out)}</div> : <span style={{ color: '#dc2626' }}>Active</span>}
                                        </td>
                                        <td style={{ padding: '0.5rem', fontWeight: 600 }}>
                                            {t.duration_hours ? Math.round(t.duration_hours * 100) / 100 : '-'}
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                {t.manual_entry && <span className="ops-status ops-status--scheduled" style={{ fontSize: '0.7rem' }}>Manual</span>}
                                                {t.was_edited && <span className="ops-status ops-status--active" style={{ fontSize: '0.7rem' }}>Edited</span>}
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.5rem', maxWidth: '14rem', verticalAlign: 'top' }}>
                                            {(() => {
                                                const hasCrewQ = !!(
                                                    t.clock_out_work_summary ||
                                                    t.clock_out_supply_needs ||
                                                    t.clock_out_day_notes ||
                                                    t.clock_out_blockers ||
                                                    t.clock_out_follow_up_needed
                                                );
                                                const adminNote = (t.edit_reason && String(t.edit_reason).trim()) || '';
                                                return (
                                                    <>
                                                        {hasCrewQ ? (
                                                            <details>
                                                                <summary className="link small" style={{ cursor: 'pointer' }}>View</summary>
                                                                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', color: 'var(--ops-muted)' }}>
                                                                    {t.clock_out_work_summary && <div><strong>Work: </strong>{t.clock_out_work_summary}</div>}
                                                                    {t.clock_out_supply_needs && <div><strong>Supplies: </strong>{t.clock_out_supply_needs}</div>}
                                                                    {t.clock_out_day_notes && <div><strong>Notes: </strong>{t.clock_out_day_notes}</div>}
                                                                    {t.clock_out_blockers && <div><strong>Blockers: </strong>{t.clock_out_blockers}</div>}
                                                                    {t.clock_out_follow_up_needed && <div style={{ color: '#92400e' }}><strong>Follow-up: </strong>Yes</div>}
                                                                </div>
                                                            </details>
                                                        ) : null}
                                                        {adminNote ? (
                                                            <div style={{ marginTop: hasCrewQ ? '0.6rem' : 0, fontSize: '0.78rem', color: 'var(--ops-muted)' }}>
                                                                <span style={{ fontWeight: 600, color: '#78350f' }}>Admin note: </span>{adminNote}
                                                            </div>
                                                        ) : null}
                                                        {!hasCrewQ && !adminNote ? <span style={{ color: 'var(--ops-muted)' }}>—</span> : null}
                                                    </>
                                                );
                                            })()}
                                        </td>
                                        <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                                            <EditTimeEntryForm
                                                entry={t}
                                                defaultClockIn={toLocalIsoString(t.clock_in)}
                                                defaultClockOut={t.clock_out ? toLocalIsoString(t.clock_out) : ''}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    </>
                    )}
                </div>

                {/* WEEKLY HOURS */}
                <div className="ops-card">
                    <h3 className="ops-section-title">Weekly hours by crew member</h3>
                    {weeklyHours.length === 0 ? (
                        <p style={{ fontSize: '0.9rem', color: 'var(--ops-muted)' }}>No data</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--ops-border)', textAlign: 'left', color: 'var(--ops-muted)' }}>
                                    <th style={{ padding: '0.5rem' }}>Crew member</th>
                                    <th style={{ padding: '0.5rem' }}>Week start</th>
                                    <th style={{ padding: '0.5rem' }}>Total hours</th>
                                </tr>
                            </thead>
                            <tbody>
                                {weeklyHours.map((row: any, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--ops-border)' }}>
                                        <td style={{ padding: '0.5rem', fontWeight: 500 }}>
                                            <Link href={`/dashboard/employees/${row.employee_id}`} style={{ color: 'var(--ops-accent-hover)', textDecoration: 'none' }}>
                                                {row.employee_name}
                                            </Link>
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>{row.week_start}</td>
                                        <td style={{ padding: '0.5rem', fontWeight: 600 }}>{row.total_hours} hr</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* MISSING CLOCK OUTS */}
                <div className="ops-card">
                    <h3 className="ops-section-title" style={{ color: '#9b2c2c' }}>Missing clock-outs ({missingClockOuts.length})</h3>
                    {missingClockOuts.length === 0 ? (
                        <p style={{ color: 'var(--ops-muted)', fontSize: '0.9rem' }}>All active shifts have been safely closed.</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--ops-border)', textAlign: 'left', color: 'var(--ops-muted)' }}>
                                    <th style={{ padding: '0.5rem' }}>Crew member</th>
                                    <th style={{ padding: '0.5rem' }}>Date</th>
                                    <th style={{ padding: '0.5rem' }}>Clock in</th>
                                    <th style={{ padding: '0.5rem' }}>Flags</th>
                                    <th style={{ padding: '0.5rem' }}>Corrections</th>
                                </tr>
                            </thead>
                            <tbody>
                                {missingClockOuts.map((t: any) => (
                                    <tr key={t.id} style={{ borderBottom: '1px solid var(--ops-border)' }}>
                                        <td style={{ padding: '0.5rem', fontWeight: 500 }}>
                                            <Link href={`/dashboard/employees/${t.employee_id}`} style={{ color: 'var(--ops-accent-hover)', textDecoration: 'none' }}>
                                                {t.employee_name}
                                            </Link>
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>{t.work_date}</td>
                                        <td style={{ padding: '0.5rem' }}>{formatTimeDisplay(t.clock_in)}</td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                {t.manual_entry && <span className="ops-status ops-status--scheduled" style={{ fontSize: '0.7rem' }}>Manual</span>}
                                                {t.was_edited && <span className="ops-status ops-status--active" style={{ fontSize: '0.7rem' }}>Edited</span>}
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                                            <EditTimeEntryForm
                                                entry={t}
                                                defaultClockIn={toLocalIsoString(t.clock_in)}
                                                defaultClockOut=""
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* CLOCK EVENT AUDIT */}
                <div className="ops-card">
                    <h3 className="ops-section-title">Recent clock events</h3>
                    <p className="ops-section-lead">
                        Attempts and outcomes for clock-in/out (including failures).
                    </p>
                    <ClockEventHistory events={clockEvents} showEmployee={!employeeId} />
                </div>

            </div>
        </div>
    )
}
