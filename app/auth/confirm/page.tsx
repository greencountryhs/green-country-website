'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function ConfirmAuthPage() {
    const router = useRouter()
    const supabase = createClient()
    const [errorMsg, setErrorMsg] = useState('')

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session }, error } = await supabase.auth.getSession()

            if (error) {
                setErrorMsg(error.message)
                return
            }

            if (session) {
                router.push('/update-password')
            }
        }

        checkSession()

        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
                    router.push('/update-password')
                }
            }
        )

        return () => {
            authListener.subscription.unsubscribe()
        }
    }, [router, supabase])

    return (
        <div className="page center" style={{ textAlign: 'center', marginTop: '10vh' }}>
            <h2>Confirming your invite...</h2>
            {errorMsg ? (
                <p style={{ color: 'red', marginTop: '1rem' }}>{errorMsg}</p>
            ) : (
                <p style={{ color: 'var(--muted)', marginTop: '1rem' }}>Please wait while we establish your secure session.</p>
            )}
        </div>
    )
}
