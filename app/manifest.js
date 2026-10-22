// Manifesto do app: nome e ícones usados quando alguém instala o Mister Studio no celular ou no computador.
export default function manifest() {
    return {
        name: 'Mister Studio',
        short_name: 'Mister Studio',
        description: 'Vídeos com inteligência: imagens, vídeos, vozes e avatares com IA.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        lang: 'pt-BR',
        icons: [
            { src: '/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icone-mascara-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
    };
}
