import { headers } from 'next/headers';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { ProvedorHistorico } from '@/lib/historico';
import { Aviso, Cabecalho, NavInferior } from '@/components/Moldura';
import { Abertura } from '@/components/Marca';

const CHAVE_ABERTURA = 'mister-estudio:abertura'; // a mesma de components/Marca.js

export const metadata = {
    title: 'Mister Studio',
    description: 'Imagens, vídeos e avatares falantes com IA, pelo Kie.ai.',
    icons: { icon: '/icone.svg', apple: '/icone-180.png' },
};

export const viewport = { themeColor: '#ffffff', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default async function RootLayout({ children }) {
    const telaDeLogin = (await headers()).get('x-tela-login') === '1';
    return (
        <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
            <head>
                {/* Esconde a abertura antes de desenhar a página, se ela já apareceu nesta sessão */}
                <script dangerouslySetInnerHTML={{ __html: `try{if(sessionStorage.getItem('${CHAVE_ABERTURA}'))document.documentElement.classList.add('sem-abertura')}catch(e){}` }} />
            </head>
            <body className="min-h-screen bg-white text-tinta">
                <ProvedorHistorico>
                    {!telaDeLogin && <Cabecalho />}
                    {children}
                    {!telaDeLogin && <NavInferior />}
                    <Aviso />
                    <Abertura />
                </ProvedorHistorico>
            </body>
        </html>
    );
}
