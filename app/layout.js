import './globals.css';

export const metadata = {
  title: 'Estúdio — Mister',
  description: 'Gere imagens, vídeos e lip sync com IA pelo Kie.ai.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
