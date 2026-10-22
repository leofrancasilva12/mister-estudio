import { Suspense } from 'react';
import TelaLipSync from './tela';

export const metadata = { title: 'Lip Sync · Mister Studio' };

export default function Pagina() {
    return <Suspense><TelaLipSync /></Suspense>;
}
