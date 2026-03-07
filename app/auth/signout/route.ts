import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
    const supabase = await createClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
        return redirect('/dashboard?error=Could not sign out')
    }

    return redirect('/login')
}
