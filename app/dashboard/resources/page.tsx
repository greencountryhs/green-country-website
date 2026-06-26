import { PageHeader } from '@/components/dashboard/ops/PageHeader'
import { OpsIcon } from '@/components/dashboard/ops/Icon'
import { OPS_RESOURCES, RESOURCE_CATEGORY_LABELS } from '@/lib/dashboard/resources'
import { createClient } from '@/utils/supabase/server'

export default async function ResourcesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = user
        ? await supabase.from('profiles').select('role').eq('id', user.id).single()
        : { data: null }

    const isAdmin = profile?.role === 'admin'

    const grouped = OPS_RESOURCES.reduce<Record<string, typeof OPS_RESOURCES>>((acc, item) => {
        const key = item.category
        acc[key] = acc[key] || []
        acc[key].push(item)
        return acc
    }, {})

    const categoryOrder = ['how-to', 'video', 'sop', 'procedure', 'safety', 'training'] as const

    return (
        <div>
            <PageHeader
                title="Resources & Help"
                lead="Training, safety reminders, SOPs, and how-to guides for field and office work. Links are placeholders until final URLs are added."
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {categoryOrder.map((category) => {
                    const items = grouped[category]
                    if (!items?.length) return null
                    return (
                        <section key={category}>
                            <h2 className="ops-section-title">
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <OpsIcon name={category === 'safety' ? 'help' : 'resources'} size={18} />
                                    {RESOURCE_CATEGORY_LABELS[category]}
                                </span>
                            </h2>
                            <div className="ops-resource-list">
                                {items.map((item) => (
                                    <article key={item.id} className="ops-resource-item">
                                        <span className="ops-resource-item__tag">
                                            {RESOURCE_CATEGORY_LABELS[item.category]}
                                        </span>
                                        <div>
                                            <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1rem', color: 'var(--ops-ink)' }}>
                                                <a href={item.href} target="_blank" rel="noopener noreferrer">
                                                    {item.title}
                                                </a>
                                            </h3>
                                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--ops-muted)', lineHeight: 1.5 }}>
                                                {item.description}
                                            </p>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    )
                })}
            </div>

            <div className="ops-callout ops-callout--info" style={{ marginTop: '2rem' }}>
                Need something added? Contact Jon.
                {isAdmin && (
                    <>
                        {' '}Resource links can be updated in{' '}
                        <code style={{ fontSize: '0.85rem' }}>lib/dashboard/resources.ts</code>.
                    </>
                )}
            </div>
        </div>
    )
}
