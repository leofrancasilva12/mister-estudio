import { Suspense } from 'react';
import TelaFerramentas from './tela';

export const metadata = { title: 'Ferramentas · Estúdio' };

export default function Pagina() {
    return <Suspense><TelaFerramentas /></Suspense>;
}
