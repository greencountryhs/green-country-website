import { getManagerInbox } from '@/lib/notes'
import { NotificationBell } from '@/components/notes/NotificationBell'
import { ManagerInboxList } from '@/components/notes/ManagerInboxList'
export async function UnreadManagerNotesCard({ employeeId }: { employeeId: string }) {
    const notes = await getManagerInbox(employeeId)
    const unreadCount = notes.filter((n: any) => !n.isRead).length

    return (
        <div className="card callout">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Manager Inbox</h3>
                <NotificationBell count={unreadCount} />
            </div>

            <ManagerInboxList notes={notes} employeeId={employeeId} />
        </div>
    )
}
