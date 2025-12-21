import './Footer.css';

export const Footer = () => {
    return (
        <footer className="app-footer">
            <div className="footer-container">
                {/* Left: Brand + Copyright */}
                <div className="footer-left">
                    <div className="footer-icon-box">
                        <svg className="footer-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                            <text x="12" y="14.5" fill="#fbbf24" fontSize="16" fontWeight="900" textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>A</text>
                        </svg>
                    </div>

                    <p className="copyright-text">
                        © 2024 APIM Self Service. All rights reserved.
                    </p>
                </div>

                {/* Right: Contact */}
                <div className="footer-right">
                    <div className="contact-icon-box">
                        <svg className="contact-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <p className="contact-label">Contact</p>
                        <a
                            href="mailto:apim-admin@company.com"
                            className="contact-email"
                        >
                            apim-admin@company.com
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};
