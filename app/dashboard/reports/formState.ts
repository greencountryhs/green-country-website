export type ReportFormState = {
    error: string | null
    success: boolean
}

export const initialReportFormState: ReportFormState = { error: null, success: false }

export const errorBannerStyle = {
    background: '#fef2f2',
    color: '#991b1b',
    borderColor: '#fecaca',
    marginBottom: '0.75rem'
} as const
