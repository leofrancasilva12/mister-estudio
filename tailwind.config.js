/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
    theme: {
        extend: {
            colors: {
                tinta: '#111111',
                cinza: '#5f5f5f',
                suave: '#6b6b6b',
                fundo: '#f6f6f4',
                pedra: '#f2f2f0',
                linha: 'rgba(17,17,17,0.12)',
                fina: 'rgba(17,17,17,0.08)',
                alerta: '#a32d2d',
            },
            fontFamily: {
                sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
                mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
            },
            keyframes: {
                subir: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'none' } },
                gaveta: { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
                lateral: { from: { transform: 'translateX(-100%)' }, to: { transform: 'none' } },
                escurecer: { from: { opacity: '0' }, to: { opacity: '1' } },
                carregar: { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(250%)' } },
                pulsar: { '0%,100%': { opacity: '.55' }, '50%': { opacity: '1' } },
                entrar: { from: { opacity: '0', transform: 'scale(.98)' }, to: { opacity: '1', transform: 'none' } },
            },
            animation: {
                subir: 'subir .45s ease both',
                gaveta: 'gaveta .32s cubic-bezier(.2,.8,.2,1) both',
                lateral: 'lateral .3s cubic-bezier(.2,.8,.2,1) both',
                escurecer: 'escurecer .25s ease both',
                carregar: 'carregar 1.4s ease-in-out infinite',
                pulsar: 'pulsar 1.6s ease infinite',
                entrar: 'entrar .35s ease both',
            },
        },
    },
    plugins: [],
};
