import { Suspense } from 'react';
import TelaCinema from './tela';

export const metadata = { title: 'Cinema · Mister Studio' };

export default function Pagina() {
    return <Suspense><TelaCinema /></Suspense>;
}
