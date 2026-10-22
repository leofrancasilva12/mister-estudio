'use client';

import Link from 'next/link';
import { useState } from 'react';
import Icone from '@/components/Icone';
import Visualizador from '@/components/Visualizador';
import { useHistorico } from '@/lib/historico';

const q = (o) => new URLSearchParams(o).toString();

const DESTAQUES = [
    { nome: 'Nano Banana Pro', marca: 'Google · imagem', href: '/imagem?modelo=nano-banana-pro', escuro: false, tom: '#efefec' },
    { nome: 'Seedream 5.0 Pro', marca: 'ByteDance · imagem', href: '/imagem?modelo=seedream-5-pro', escuro: false, tom: '#e7e7e3' },
    { nome: 'GPT Image 2', marca: 'OpenAI · imagem', href: '/imagem?modelo=gpt-image-2', escuro: false, tom: '#f2f1ee' },
    { nome: 'Kling 3.0', marca: 'Kuaishou · vídeo', href: '/video?modelo=v-kling-3', escuro: true, tom: '#111111' },
    { nome: 'Veo 3.1', marca: 'Google · vídeo com som', href: '/video?modelo=v-veo-3-1', escuro: true, tom: '#262626' },
    { nome: 'Seedance 2.5', marca: 'ByteDance · até 30 s', href: '/video?modelo=v-seedance-2-5', escuro: true, tom: '#3a3a3a' },
];

const PRESETS = [
    { nome: 'Foto de produto', texto: 'Fundo limpo e luz de estúdio', icone: 'produto', href: `/imagem?${q({ prompt: 'Fotografia de produto de [seu produto] sobre fundo off-white, luz suave de estúdio, sombra delicada, alta definição' })}` },
    { nome: 'Retrato editorial', texto: 'Luz natural, pele realista', icone: 'retrato', href: `/imagem?${q({ prompt: 'Retrato editorial de [pessoa], luz natural de janela, fundo neutro, pele realista, lente 85mm' })}` },
    { nome: 'Avatar falante', texto: 'Uma foto e um áudio viram vídeo', icone: 'rosto', href: '/lipsync' },
    { nome: 'Câmera orbital', texto: 'Gira em volta do produto', icone: 'orbita', href: `/video?${q({ prompt: 'A câmera gira devagar em volta de [seu produto] sobre uma mesa clara, reflexos suaves' })}` },
    { nome: 'Cena de cinema', texto: 'Câmera, lente e abertura reais', icone: 'camera', href: '/cinema' },
    { nome: 'Animar uma foto', texto: 'Dê movimento a uma imagem', icone: 'video', href: `/video?${q({ modo: 'imagem' })}` },
    { nome: 'Fazer alguém falar', texto: 'Foto + o seu áudio do ElevenLabs', icone: 'rosto', href: '/lipsync' },
    { nome: 'Remover fundo', texto: 'Recorte limpo em um toque', icone: 'faisca', href: `/ferramentas?${q({ ferramenta: 'recraft-fundo' })}` },
    { nome: 'Ampliar para 4K', texto: 'Mais nitidez em imagem e vídeo', icone: 'ampliar', href: '/ferramentas' },
];

export default function Explorar() {
    const { itens } = useHistorico();
    const prontos = itens.filter((i) => i.estado === 'pronto' && i.midia !== 'audio');
    const recentes = prontos.slice(0, 6);
    const [aberto, setAberto] = useState(null);

    return (
        <main className="mx-auto flex w-full max-w-[1280px] animate-subir flex-col gap-12 px-4 pb-28 pt-6 md:px-8 lg:pb-16 md:pt-10">
            <section aria-labelledby="t-modelos" className="flex flex-col gap-4">
                <h2 id="t-modelos" className="text-xl font-medium tracking-tight">Modelos disponíveis</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {DESTAQUES.map((m) => (
                        <Link key={m.nome} href={m.href} className="flex flex-col gap-3 rounded-[18px] border border-fina p-2.5 transition-all hover:-translate-y-0.5 hover:border-tinta/30">
                            <span className={`flex aspect-[4/3] items-center justify-center rounded-xl ${m.escuro ? 'text-white' : 'text-suave'}`} style={{ background: m.tom }}>
                                <Icone nome={m.escuro ? 'play' : 'imagem'} tamanho={20} />
                            </span>
                            <span className="flex flex-col gap-0.5 px-1 pb-1"><span className="text-[15px] font-medium">{m.nome}</span><span className="text-xs text-cinza">{m.marca}</span></span>
                        </Link>
                    ))}
                </div>
            </section>

            <section aria-labelledby="t-presets" className="flex flex-col gap-4">
                <h2 id="t-presets" className="text-xl font-medium tracking-tight">Comece por um preset</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {PRESETS.map((p) => (
                        <Link key={p.nome} href={p.href} className="flex items-center gap-3.5 rounded-[18px] border border-fina p-4 transition-all hover:-translate-y-0.5 hover:border-tinta/30">
                            <span className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-[14px] bg-pedra"><Icone nome={p.icone} tamanho={22} /></span>
                            <span className="flex flex-col gap-1"><span className="text-[15px] font-medium">{p.nome}</span><span className="text-[13px] text-cinza">{p.texto}</span></span>
                        </Link>
                    ))}
                </div>
            </section>

            {recentes.length > 0 && (
                <section aria-labelledby="t-recentes" className="flex flex-col gap-4">
                    <div className="flex items-baseline justify-between">
                        <h2 id="t-recentes" className="text-xl font-medium tracking-tight">Continue de onde parou</h2>
                        <Link href="/biblioteca" className="flex min-h-11 items-center text-sm text-[#3d3d3d]">Abrir biblioteca</Link>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
                        {recentes.map((i) => (
                            <button key={i.id} type="button" onClick={() => setAberto(i.id)} aria-label={`Abrir: ${i.prompt || i.titulo}`} className="overflow-hidden rounded-2xl bg-pedra" style={{ aspectRatio: '4 / 5' }}>
                                {i.midia === 'video'
                                    ? <video src={i.url} muted playsInline preload="metadata" className="h-full w-full bg-tinta object-cover" />
                                    // eslint-disable-next-line @next/next/no-img-element
                                    : <img src={i.url} alt="" loading="lazy" className="h-full w-full object-cover" />}
                            </button>
                        ))}
                    </div>
                </section>
            )}
            {aberto && <Visualizador itens={prontos} id={aberto} aoMudar={setAberto} aoFechar={() => setAberto(null)} />}
        </main>
    );
}
