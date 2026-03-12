'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getURL } from '@/utils/get-url'

export async function resetPassword(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string

    const timestamp = new Date().toISOString()
    console.log(`[AUDIT - ${timestamp}] resetPassword action invoked for email: ${email}`)

    // Get origin for the reset link redirect
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getURL()}auth/callback?next=/update-password`,
    })

    if (error) {
        console.error(`[AUDIT - ${timestamp}] resetPassword API ERROR for ${email}:`, error)

        if (error.message?.toLowerCase().includes('rate limit')) {
            redirect(`/forgot-password?error=${encodeURIComponent("Email Rate Limit Exceeded. Supabase enforces a strict hourly limit on default emails. Please wait or configure Custom SMTP.")}`)
        }

        redirect(`/forgot-password?error=${encodeURIComponent(`Provider Error: ${error.message}`)}`)
    }

    console.log(`[AUDIT - ${timestamp}] resetPassword API SUCCESS for ${email}`)
    redirect('/forgot-password?message=Check your email for the password reset link.')
}
