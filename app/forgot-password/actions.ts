'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function resetPassword(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string

    // Get origin for the reset link redirect (in a real app, you might want to configure this more robustly)
    // We can use a standard relative URL and Supabase constructs it with the Site URL
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/update-password`,
    })

    if (error) {
        redirect('/forgot-password?error=Could not send reset link. Please try again.')
    }

    redirect('/forgot-password?message=Check your email for the password reset link.')
}
