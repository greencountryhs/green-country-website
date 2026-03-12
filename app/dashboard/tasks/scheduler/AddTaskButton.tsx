'use client'

import { useState } from 'react'
import { TaskEditorModal, TaskEditorData } from '@/components/tasks/TaskEditorModal'

export function AddTaskButton({
    dateStr,
    editorData,
    label = "Schedule Instance",
    className = "cta primary",
    style = {}
}: {
    dateStr: string,
    editorData: TaskEditorData,
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
            <TaskEditorModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                defaultDateStr={dateStr}
                editorData={editorData}
            />
        </>
    )
}
