'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        // You might want to handle this better in a real app, e.g., passing error state
        // But for a simple internal tool, this is okay or you can throw
        console.error("Login Error", error.message);
        redirect('/login?error=Could not log in')
    }

    revalidatePath('/dashboard')
    redirect('/dashboard')
}
