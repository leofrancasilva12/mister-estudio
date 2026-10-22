import { Suspense } from 'react';
import TelaAudio from './tela';

export const metadata = { title: 'Áudio · Mister Studio' };

export default function Pagina() {
    return <Suspense><TelaAudio /></Suspense>;
}
