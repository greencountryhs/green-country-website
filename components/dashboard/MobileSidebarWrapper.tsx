'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function MobileSidebarWrapper({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="ops-mobile-menu-btn"
                aria-label="Open menu"
            >
                ☰
            </button>

            {isOpen && (
                <div
                    className="ops-mobile-backdrop"
                    onClick={() => setIsOpen(false)}
                    aria-hidden
                />
            )}

            <aside className={`ops-sidebar${isOpen ? ' open' : ''}`}>
                <div className="ops-mobile-close">
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '1.4rem',
                            cursor: 'pointer',
                            color: 'var(--ops-muted)',
                            minWidth: 44,
                            minHeight: 44
                        }}
                        aria-label="Close menu"
                    >
                        ✕
                    </button>
                </div>
                <div className="ops-sidebar__inner">{children}</div>
            </aside>
        </>
    );
}
