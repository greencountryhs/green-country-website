'use client'

import { useFormStatus } from 'react-dom'

export function SubmitButton({
    children,
    text = "Submit",
    pendingText = "Working..."
}: {
    children?: React.ReactNode,
    text?: string,
    pendingText?: string
}) {
    const { pending } = useFormStatus()
    return (
        <button type="submit" className="cta" style={{ marginTop: '1rem', width: '100%' }} disabled={pending}>
            {pending ? pendingText : (children || text)}
        </button>
    )
}
