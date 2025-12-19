/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#0B0E14',
                accent: '#25D0AB',
                surface: '#1A1D24',
            },
            fontFamily: {
                sans: ['"Space Grotesk"', 'sans-serif'],
                mono: ['"Space Mono"', 'monospace'],
            },
        },
    },
    plugins: [],
}
