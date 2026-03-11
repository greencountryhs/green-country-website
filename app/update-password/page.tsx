import { updatePassword } from './actions'
import { SubmitButton } from '@/components/submit-button'
import { PasswordInput } from '@/components/password-input'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function UpdatePasswordPage({ searchParams }: { searchParams: { error?: string } }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login?error=Please log in with your invite link to set your password.')
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = profile?.role === 'admin'

    return (
        <div className="page center">
            <form action={updatePassword} className="callout" style={{ maxWidth: '400px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', margin: '2rem auto' }}>
                <h1 style={{ textAlign: 'center', marginBottom: '1rem' }}>Enter New Password</h1>

                {searchParams?.error && (
                    <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '4px', textAlign: 'center' }}>
                        {searchParams.error}
                    </div>
                )}

                {isAdmin && (
                    <div style={{ padding: '0.75rem', background: '#fef08a', color: '#854d0e', borderRadius: '4px', fontSize: '0.85rem' }}>
                        <strong>⚠️ Admin Session Active!</strong><br />
                        You are currently logged in as {user.email}.<br />
                        Setting a password here will change the password for <strong>this admin account</strong>.<br />
                        If you are testing an employee invite, please open the invite link in an <strong>Incognito/Private</strong> window!
                    </div>
                )}

                <PasswordInput name="password" id="password" label="New Password" required />

                <SubmitButton>Update Password</SubmitButton>
            </form>
        </div>
    )
}
