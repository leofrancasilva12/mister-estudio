import { Suspense } from 'react';
import TelaLipSync from './tela';

export const metadata = { title: 'Lip Sync · Estúdio' };

export default function Pagina() {
    return <Suspense><TelaLipSync /></Suspense>;
}
