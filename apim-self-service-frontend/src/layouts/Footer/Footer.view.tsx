export const Footer = () => {
    return (
        <footer style={{
            backgroundColor: '#1e293b',
            borderTop: '2px solid #64748b',
            marginTop: 'auto',
            boxShadow: '0 -2px 4px 0 rgba(0, 0, 0, 0.2)'
        }}>
            <div style={{
                maxWidth: '1920px',
                margin: '0 auto',
                padding: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
            }}>

                {/* Left: Brand + Copyright */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* APIM Icon */}
                    <div style={{
                        width: '28px',
                        height: '28px',
                        background: 'linear-gradient(to bottom right, #3b82f6, #2563eb)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <svg style={{ width: '20px', height: '20px', color: 'white' }} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                            <text x="12" y="14.5" fill="#fbbf24" fontSize="16" fontWeight="900" textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>A</text>
                        </svg>
                    </div>

                    <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
                        © 2024 APIM Self Service. All rights reserved.
                    </p>
                </div>

                {/* Right: Contact */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: '#334155',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <svg style={{ width: '16px', height: '16px', color: '#60a5fa' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 2px 0' }}>Contact</p>
                        <a
                            href="mailto:apim-admin@company.com"
                            style={{
                                fontSize: '14px',
                                color: '#cbd5e1',
                                textDecoration: 'none',
                                transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#60a5fa'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#cbd5e1'}
                        >
                            apim-admin@company.com
                        </a>
                    </div>
                </div>

            </div>
        </footer>
    );
};
