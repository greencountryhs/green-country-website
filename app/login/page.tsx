import { login } from './actions'

export default function LoginPage() {
    return (
        <div className="page center">
            <form className="callout" style={{ maxWidth: '400px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', margin: '2rem auto' }}>
                <h1 style={{ textAlign: 'center', marginBottom: '1rem' }}>Employee Login</h1>

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

                <div>
                    <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Password</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '1rem' }}
                    />
                </div>

                <button formAction={login} className="cta" style={{ marginTop: '1rem', width: '100%' }}>
                    Log In
                </button>
            </form>
        </div>
    )
}
