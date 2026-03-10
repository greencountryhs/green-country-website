import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CAPABILITIES } from '@/lib/auth/capabilities'
import { requireCapability } from '@/lib/auth/requireCapability'
import { getMissingClockOuts, getRecentTimeEntries, getWeeklyHoursReport } from '@/lib/reports'
import { EditTimeEntryForm, CreateManualEntryForm } from './ReportActions'

export default async function ReportsDashboardPage({ searchParams }: { searchParams: { employeeId?: string, startDate?: string, endDate?: string } }) {
    const isAuthorized = await requireCapability(CAPABILITIES.VIEW_TIME_REPORTS)
    if (!isAuthorized) {
        redirect('/dashboard')
    }

    const { employeeId, startDate, endDate } = searchParams

    // Fetch employees for filter dropdowns
    const supabase = await createClient()
    const { data: employees } = await supabase.from('employees').select('id, display_name').eq('is_active', true)

    // Server-side loading using the view
    const filters = { employeeId, startDate, endDate }
    const weeklyHours = await getWeeklyHoursReport(filters)
    const missingClockOuts = await getMissingClockOuts(filters)
    const recentEntries = await getRecentTimeEntries(50, filters)

    function formatTimeDisplay(isoString: string) {
        return new Date(isoString).toLocaleString([], {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })
    }

    // Default values for datetime-local
    function toLocalIsoString(isoString: string) {
        const d = new Date(isoString)
        try {
            return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
        } catch (e) {
            return ""
        }
    }

    return (
        <div className="page" style={{ maxWidth: '1000px' }}>
            <Link href="/dashboard" className="link small" style={{ display: 'inline-block', marginBottom: '1rem' }}>
                &larr; Back to Dashboard
            </Link>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h1 style={{ margin: 0 }}>Operational Time Reports</h1>
            </div>

            <p className="section-lead" style={{ marginBottom: '1rem' }}>
                Review and correct crew time entries. (Financial payroll logic is handled separately).
            </p>

            {/* FILTERS */}
            <div className="card" style={{ marginBottom: '2rem', padding: '1rem', background: '#f8fafc' }}>
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
                    <button type="submit" className="cta primary" style={{ padding: '0.5rem 1rem' }}>Apply Filters</button>
                    {(employeeId || startDate || endDate) && (
                        <Link href="/dashboard/reports" className="link small" style={{ marginLeft: '1rem' }}>Clear</Link>
                    )}
                </form>
            </div>

            <div style={{ display: 'grid', gap: '2rem' }}>

                {/* MANUAL ENTRY */}
                <CreateManualEntryForm employees={employees?.map(e => ({ id: e.id, name: e.display_name })) || []} />

                {/* WEEKLY HOURS */}
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Weekly Hours by Crew Member</h3>
                    {weeklyHours.length === 0 ? <p className="muted" style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>No data</p> : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--muted)' }}>
                                    <th style={{ padding: '0.5rem' }}>Crew Member</th>
                                    <th style={{ padding: '0.5rem' }}>Week Start</th>
                                    <th style={{ padding: '0.5rem' }}>Total Hours</th>
                                </tr>
                            </thead>
                            <tbody>
                                {weeklyHours.map((row: any, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '0.5rem', fontWeight: 500 }}>
                                            <Link href={`/dashboard/employees/${row.employee_id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
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
                <div className="card">
                    <h3 style={{ color: '#dc2626', marginBottom: '1rem' }}>Missing Clock-Outs ({missingClockOuts.length})</h3>
                    {missingClockOuts.length === 0 ? (
                        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>All active shifts have been safely closed.</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--muted)' }}>
                                    <th style={{ padding: '0.5rem' }}>Crew Member</th>
                                    <th style={{ padding: '0.5rem' }}>Date</th>
                                    <th style={{ padding: '0.5rem' }}>Clock In</th>
                                    <th style={{ padding: '0.5rem' }}>Flags</th>
                                    <th style={{ padding: '0.5rem' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {missingClockOuts.map((t: any) => (
                                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '0.5rem', fontWeight: 500 }}>
                                            <Link href={`/dashboard/employees/${t.employee_id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                                {t.employee_name}
                                            </Link>
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>{t.work_date}</td>
                                        <td style={{ padding: '0.5rem' }}>{formatTimeDisplay(t.clock_in)}</td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                {t.manual_entry && <span className="badge" title="Manual" style={{ padding: '0.1rem 0.3rem', borderRadius: '4px', background: '#fef08a', color: '#854d0e', fontSize: '0.7rem' }}>M</span>}
                                                {t.was_edited && <span className="badge" title="Edited" style={{ padding: '0.1rem 0.3rem', borderRadius: '4px', background: '#e0e7ff', color: '#3730a3', fontSize: '0.7rem' }}>E</span>}
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <EditTimeEntryForm
                                                entry={t}
                                                defaultClockIn={toLocalIsoString(t.clock_in)}
                                                defaultClockOut={""}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* RECENT ENTRIES */}
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Recent Time Entries</h3>
                    {recentEntries.length === 0 ? <p className="muted" style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>No data</p> : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--muted)' }}>
                                    <th style={{ padding: '0.5rem' }}>Crew Member</th>
                                    <th style={{ padding: '0.5rem' }}>Date</th>
                                    <th style={{ padding: '0.5rem' }}>In / Out</th>
                                    <th style={{ padding: '0.5rem' }}>Dur (hr)</th>
                                    <th style={{ padding: '0.5rem' }}>Flags</th>
                                    <th style={{ padding: '0.5rem' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentEntries.map((t: any) => (
                                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '0.5rem', fontWeight: 500 }}>
                                            <Link href={`/dashboard/employees/${t.employee_id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                                {t.employee_name}
                                            </Link>
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>{t.work_date}</td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <div>{formatTimeDisplay(t.clock_in)}</div>
                                            {t.clock_out ? <div style={{ color: 'var(--muted)' }}>{formatTimeDisplay(t.clock_out)}</div> : <span style={{ color: '#dc2626' }}>Active</span>}
                                        </td>
                                        <td style={{ padding: '0.5rem', fontWeight: 600 }}>
                                            {t.duration_hours ? Math.round(t.duration_hours * 100) / 100 : '-'}
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                {t.manual_entry && <span className="badge" title="Manual" style={{ padding: '0.1rem 0.3rem', borderRadius: '4px', background: '#fef08a', color: '#854d0e', fontSize: '0.7rem' }}>M</span>}
                                                {t.was_edited && <span className="badge" title="Edited" style={{ padding: '0.1rem 0.3rem', borderRadius: '4px', background: '#e0e7ff', color: '#3730a3', fontSize: '0.7rem' }}>E</span>}
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <EditTimeEntryForm
                                                entry={t}
                                                defaultClockIn={toLocalIsoString(t.clock_in)}
                                                defaultClockOut={t.clock_out ? toLocalIsoString(t.clock_out) : ""}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

            </div>
        </div>
    )
}
