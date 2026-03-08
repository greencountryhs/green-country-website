import { resetPassword } from './actions'
import { SubmitButton } from '@/components/submit-button'
import Link from 'next/link'

export default function ForgotPasswordPage({ searchParams }: { searchParams: { error?: string, message?: string } }) {
    return (
        <div className="page center">
            <form action={resetPassword} className="callout" style={{ maxWidth: '400px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', margin: '2rem auto' }}>
                <h1 style={{ textAlign: 'center', marginBottom: '1rem' }}>Reset Password</h1>

                {searchParams?.error && (
                    <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '4px', textAlign: 'center' }}>
                        {searchParams.error}
                    </div>
                )}
                {searchParams?.message && (
                    <div style={{ padding: '0.75rem', background: '#dcfce7', color: '#166534', borderRadius: '4px', textAlign: 'center' }}>
                        {searchParams.message}
                    </div>
                )}

                <div>
                    <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Email</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '1rem' }}
                    />
                </div>

                <SubmitButton>Send Reset Link</SubmitButton>

                <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                    <Link href="/login" style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'underline' }}>
                        Back to Login
                    </Link>
                </div>
            </form>
        </div>
    )
}
