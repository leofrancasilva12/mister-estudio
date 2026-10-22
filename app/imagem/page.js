import { Suspense } from 'react';
import TelaImagem from './tela';

export const metadata = { title: 'Imagem · Mister Studio' };

export default function Pagina() {
    return <Suspense><TelaImagem /></Suspense>;
}
