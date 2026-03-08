'use client'

import { useFormStatus } from 'react-dom'

export function SubmitButton({ children, text = "Submit" }: { children?: React.ReactNode, text?: string }) {
    const { pending } = useFormStatus()
    return (
        <button type="submit" className="cta" style={{ marginTop: '1rem', width: '100%' }} disabled={pending}>
            {pending ? 'Working...' : (children || text)}
        </button>
    )
}
