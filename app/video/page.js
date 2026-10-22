import { Suspense } from 'react';
import TelaVideo from './tela';

export const metadata = { title: 'Vídeo · Estúdio' };

export default function Pagina() {
    return <Suspense><TelaVideo /></Suspense>;
}
