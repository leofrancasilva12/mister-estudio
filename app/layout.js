import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { ProvedorHistorico } from '@/lib/historico';
import { Aviso, Cabecalho, NavInferior } from '@/components/Moldura';

export const metadata = {
    title: 'Estúdio · Mister',
    description: 'Imagens, vídeos e avatares falantes com IA, pelo Kie.ai.',
    icons: { icon: '/icone.svg' },
};

export const viewport = { themeColor: '#ffffff', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }) {
    return (
        <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable}`}>
            <body className="min-h-screen bg-white text-tinta">
                <ProvedorHistorico>
                    <Cabecalho />
                    {children}
                    <NavInferior />
                    <Aviso />
                </ProvedorHistorico>
            </body>
        </html>
    );
}
