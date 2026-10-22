import { Suspense } from 'react';
import TelaFerramentas from './tela';

export const metadata = { title: 'Ferramentas · Mister Studio' };

export default function Pagina() {
    return <Suspense><TelaFerramentas /></Suspense>;
}
