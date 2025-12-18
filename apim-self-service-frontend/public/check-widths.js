// Simple script to check computed widths
const email = document.querySelector('input[type="email"]');
const nextBtn = document.querySelector('button[type="submit"]');
const ssoBtn = document.querySelector('button:not([type="submit"])');

if (email && nextBtn && ssoBtn) {
    const emailWidth = email.getBoundingClientRect().width;
    const nextWidth = nextBtn.getBoundingClientRect().width;
    const ssoWidth = ssoBtn.getBoundingClientRect().width;
    
    console.log('Email input width:', emailWidth);
    console.log('Next button width:', nextWidth);
    console.log('SSO button width:', ssoWidth);
    console.log('Difference (email - next):', emailWidth - nextWidth);
    console.log('Difference (email - sso):', emailWidth - ssoWidth);
    console.log('Difference (next - sso):', nextWidth - ssoWidth);
}
