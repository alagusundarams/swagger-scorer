/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    safelist: [
        // Preserve category color classes that are dynamically constructed
        'category-bar',
        'category-bar-security',
        'category-bar-documentation',
        'category-bar-apiDesign',
        'category-bar-dataModels',
        'category-bar-errorHandling',
        'category-bar-completeness',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            colors: {
                corp: {
                    bg: '#f8fafc', // Slate-50 (App Background)
                    header: '#ffffff', // White (Header)
                    border: '#e2e8f0', // Slate-200 (Borders)
                    text: {
                        primary: '#0f172a', // Slate-900
                        secondary: '#64748b', // Slate-500
                    }
                },
                slate: {
                    750: '#1e293b', // Custom intermediate slate
                    850: '#0f172a', // Deep slate
                    950: '#020617', // Pitch slate
                }
            },
            boxShadow: {
                'premium': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                'premium-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            },
            animation: {
                'fade-in': 'fadeIn 0.2s ease-out',
                'slide-up': 'slideUp 0.2s ease-out',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            },
        },
    },
    plugins: [],
}
