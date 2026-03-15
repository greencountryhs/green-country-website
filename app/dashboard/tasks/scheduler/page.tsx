import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CAPABILITIES } from '@/lib/auth/capabilities'
import { requireCapability } from '@/lib/auth/requireCapability'
import { getWeekAssignmentInstances, groupWeekAssignmentInstancesByDate, getTaskEditorData } from '@/lib/tasks'
import { InstanceActions } from './SchedulerActions'
import { AddTaskButton } from './AddTaskButton'
import { TaskCardWithDrawer } from './TaskCardWithDrawer'

export default async function WeekSchedulerPage({ searchParams }: { searchParams: { date?: string } }) {
    const isAuthorized = await requireCapability(CAPABILITIES.MANAGE_TASKS)
    if (!isAuthorized) {
        redirect('/dashboard')
    }

    // Default to nearest Monday if no date provided
    const today = new Date()
    const currentDay = today.getDay()
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1) // adjust when day is sunday
    const defaultMonday = new Date(today.setDate(diff))

    const weekStartStr = searchParams.date || defaultMonday.toISOString().split('T')[0]
    const weekStart = new Date(weekStartStr)
    const weekEndDate = new Date(weekStartStr)
    weekEndDate.setDate(weekStart.getDate() + 6)
    const weekEndDateStr = weekEndDate.toISOString().split('T')[0]

    // Generate the 7 day headers
    const days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(weekStart)
        d.setDate(weekStart.getDate() + i)
        return d.toISOString().split('T')[0]
    })

    const instances = await getWeekAssignmentInstances(weekStartStr, weekEndDateStr)
    const editorData = await getTaskEditorData()
    const instancesByDate = groupWeekAssignmentInstancesByDate(instances)

    return (
        <div className="page" style={{ maxWidth: '1400px' }}>
            <Link href="/dashboard" className="link small" style={{ display: 'inline-block', marginBottom: '1rem' }}>
                &larr; Back to Dashboard
            </Link>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h1 style={{ margin: 0 }}>Week Scheduler</h1>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <form method="GET" style={{ display: 'flex', gap: '0.5rem' }}>
                        <input type="date" name="date" defaultValue={weekStartStr} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                        <button type="submit" className="cta secondary">Go</button>
                    </form>
                    <AddTaskButton
                        dateStr={weekStartStr}
                        editorData={editorData}
                        label="Schedule Template..."
                    />
                </div>
            </div>

            <p className="section-lead" style={{ marginBottom: '2rem' }}>
                Drag or shift concrete instances to schedule daily crew work. (Source of truth: <code>task_assignment_instances</code>)
            </p>

            {/* WEEKLY GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1rem', minHeight: '60vh' }}>
                {days.map(dayStr => {
                    const dayDate = new Date(dayStr)
                    const isToday = dayStr === new Date().toISOString().split('T')[0]
                    const dayInstances = instancesByDate[dayStr] || []

                    return (
                        <div key={dayStr} style={{
                            background: '#f8fafc',
                            border: isToday ? '2px solid #1e40af' : '1px solid var(--border)',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                padding: '0.75rem',
                                background: isToday ? '#1e40af' : '#e2e8f0', // High contrast dark blue for today
                                color: isToday ? '#ffffff' : 'inherit',
                                borderBottom: '1px solid var(--border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>
                                        {dayDate.toLocaleDateString([], { weekday: 'short' })}
                                    </div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                                        {dayDate.getDate()}
                                    </div>
                                </div>
                                <AddTaskButton
                                    dateStr={dayStr}
                                    editorData={editorData}
                                    label="+"
                                    className=""
                                    style={{
                                        background: isToday ? 'rgba(255,255,255,0.2)' : 'white',
                                        color: isToday ? 'white' : 'var(--foreground)',
                                        border: 'none', borderRadius: '4px', width: '28px', height: '28px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', fontWeight: 'bold'
                                    }}
                                />
                            </div>

                            <div style={{ padding: '0.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
                                {dayInstances.map((inst) => {
                                    const displayTitle = inst.title || 'Unknown'
                                    const rawTarget = inst.targets[0]
                                    let assignmentLabel = 'Unassigned'
                                    if (rawTarget) {
                                        if (rawTarget.targetType === 'all_crew') assignmentLabel = 'All Crew'
                                        else if (rawTarget.targetType === 'employee') assignmentLabel = rawTarget.employeeName || 'Unknown Employee'
                                        else if (rawTarget.targetType === 'role') assignmentLabel = rawTarget.roleName || 'Unknown Role'
                                    }

                                    let typeLabel = 'General Task'
                                    if (!inst.isOverride) {
                                        if (inst.displayMode === 'full') typeLabel = 'Static Checklist'
                                        else if (inst.displayMode === 'single' || inst.displayMode === 'section') typeLabel = 'Interactive Checklist'
                                        else typeLabel = 'Task'
                                    }

                                    return (
                                        <TaskCardWithDrawer 
                                            key={inst.id} 
                                            inst={inst} 
                                            displayTitle={displayTitle} 
                                            typeLabel={typeLabel} 
                                            assignmentLabel={assignmentLabel} 
                                        />
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
