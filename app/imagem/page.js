import { Suspense } from 'react';
import TelaImagem from './tela';

export const metadata = { title: 'Imagem · Estúdio' };

export default function Pagina() {
    return <Suspense><TelaImagem /></Suspense>;
}
