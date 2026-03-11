import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const token_hash = requestUrl.searchParams.get('token_hash')
    const type = requestUrl.searchParams.get('type')
    const next = requestUrl.searchParams.get('next') ?? '/dashboard'

    const supabase = await createClient()

    if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
            type: type as any,
            token_hash,
        })

        if (error) {
            return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url))
        }

        return NextResponse.redirect(new URL(next, request.url))
    }

    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url))
        }
    }

    // URL to redirect to after sign in process completes
    return NextResponse.redirect(new URL(next, request.url))
}
