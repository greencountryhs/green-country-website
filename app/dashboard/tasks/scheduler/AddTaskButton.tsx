'use client'

import { useState } from 'react'
import { SchedulerModal } from './SchedulerModal'

export function AddTaskButton({
    dateStr,
    templates,
    label = "Schedule Instance",
    className = "cta primary",
    style = {}
}: {
    dateStr: string,
    templates: { id: string, title: string }[],
    label?: string,
    className?: string,
    style?: React.CSSProperties
}) {
    const [isOpen, setIsOpen] = useState(false)
    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={className}
                style={style}
            >
                {label}
            </button>
            <SchedulerModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                selectedDateStr={dateStr}
                templates={templates}
            />
        </>
    )
}
