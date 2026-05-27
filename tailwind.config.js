/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                'edu-dark': '#1e293b',
                'edu-mint': '#4ade80',
                'edu-sky': '#f0f9ff',
            },
        },
    },
    plugins: [],
}