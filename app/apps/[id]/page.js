import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { appPorId } from '@/lib/apps';
import TelaApp from './tela';
import TelaPersonagens from './personagens';
import TelaPincel from './pincel';

export async function generateMetadata({ params }) {
    const app = appPorId((await params).id);
    return { title: `${app?.nome || 'App'} · Estúdio` };
}

export default async function Pagina({ params }) {
    const { id } = await params;
    const app = appPorId(id);
    if (!app || app.link) notFound();
    const Tela = id === 'personagens' ? TelaPersonagens : id === 'pincel' ? TelaPincel : TelaApp;
    return <Suspense><Tela id={id} /></Suspense>;
}
