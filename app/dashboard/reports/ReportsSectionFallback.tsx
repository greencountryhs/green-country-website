export function ReportsSectionFallback({
    title,
    message
}: {
    title: string
    message: string
}) {
    return (
        <div className="ops-callout ops-callout--error" style={{ marginTop: '0.5rem' }}>
            <p style={{ margin: 0 }}>
                <strong>{title}.</strong> {message}
            </p>
        </div>
    )
}

export async function safeReportsSection<T>(
    section: string,
    load: () => Promise<T>,
    fallback: T
): Promise<{ data: T; error: string | null }> {
    try {
        const data = await load()
        return { data, error: null }
    } catch (err) {
        console.error(`[reports-page] section failed: ${section}`, err)
        return {
            data: fallback,
            error: `Could not load ${section}. Try refreshing the page.`
        }
    }
}
