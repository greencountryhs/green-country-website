'use client'

import { useState } from 'react'

interface PasswordInputProps {
    id?: string;
    name?: string;
    label?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    required?: boolean;
}

export function PasswordInput({ 
    id = 'password', 
    name = 'password', 
    label, 
    value, 
    onChange, 
    placeholder, 
    required = true 
}: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false)

    return (
        <div style={{ width: '100%', marginBottom: label ? '0' : '1rem' }}>
            {label && (
                <label htmlFor={id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 600 }}>
                    <span>{label}</span>
                    <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}
                    >
                        {showPassword ? 'Hide' : 'Show'}
                    </button>
                </label>
            )}
            
            <div style={{ position: 'relative' }}>
                <input
                    id={id}
                    name={name}
                    type={showPassword ? "text" : "password"}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    required={required}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '1rem' }}
                />
                
                {!label && (
                    <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ 
                            position: 'absolute', 
                            right: '0.75rem', 
                            top: '50%', 
                            transform: 'translateY(-50%)',
                            background: 'none', 
                            border: 'none', 
                            color: 'var(--muted)', 
                            fontSize: '0.85rem', 
                            cursor: 'pointer', 
                            padding: '0.25rem' 
                        }}
                    >
                        {showPassword ? 'Hide' : 'Show'}
                    </button>
                )}
            </div>
        </div>
    )
}
