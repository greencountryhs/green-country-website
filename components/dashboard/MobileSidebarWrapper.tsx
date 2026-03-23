'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function MobileSidebarWrapper({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    // Close sidebar when route changes
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    return (
        <>
            <button 
                onClick={() => setIsOpen(true)} 
                className="mobile-menu-btn"
                aria-label="Open Menu"
            >
                ☰
            </button>
            
            {isOpen && (
                <div 
                    className="mobile-backdrop"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside className={`sidebar-container ${isOpen ? 'open' : ''}`}>
                <div className="mobile-close-btn" style={{ padding: '1rem 1.5rem 0rem', textAlign: 'right' }}>
                    <button 
                        onClick={() => setIsOpen(false)} 
                        style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
                        aria-label="Close Menu"
                    >
                        ✕
                    </button>
                </div>
                {children}
            </aside>

            <style jsx global>{`
                .mobile-menu-btn {
                    display: none;
                    background: transparent;
                    border: none;
                    color: white;
                    font-size: 1.5rem;
                    cursor: pointer;
                    margin-right: 0.5rem;
                    position: absolute;
                    left: 1rem;
                    top: 12px;
                    z-index: 20;
                }
                .sidebar-container {
                    width: 240px;
                    background-color: white;
                    border-right: 1px solid #e2e8f0;
                    display: flex;
                    flex-direction: column;
                    flex-shrink: 0;
                    height: 100%;
                }
                .mobile-close-btn {
                    display: none;
                }
                @media (min-width: 769px) {
                    .mobile-backdrop { display: none !important; }
                }

                @media (max-width: 768px) {
                    .mobile-menu-btn {
                        display: block;
                    }
                    .mobile-close-btn {
                        display: block;
                    }
                    .mobile-backdrop {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-color: rgba(0,0,0,0.5);
                        z-index: 40;
                    }
                    .sidebar-container {
                        position: fixed;
                        top: 0;
                        left: 0;
                        bottom: 0;
                        z-index: 50;
                        transform: translateX(-100%);
                        transition: transform 0.3s ease-in-out;
                    }
                    .sidebar-container.open {
                        transform: translateX(0);
                    }
                }
            `}</style>
        </>
    );
}
