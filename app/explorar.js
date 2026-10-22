'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Icone from '@/components/Icone';
import Visualizador from '@/components/Visualizador';
import { useHistorico } from '@/lib/historico';

const q = (o) => new URLSearchParams(o).toString();

const DESTAQUES = [
    { nome: 'Nano Banana Pro', marca: 'Google · imagem', href: '/imagem', escuro: false, tom: '#efefec' },
    { nome: 'Seedream 5.0 Pro', marca: 'ByteDance · imagem', href: '/imagem', escuro: false, tom: '#e7e7e3' },
    { nome: 'GPT Image 2', marca: 'OpenAI · imagem', href: '/imagem', escuro: false, tom: '#f2f1ee' },
    { nome: 'Kling 3.0', marca: 'Kuaishou · vídeo', href: '/video', escuro: true, tom: '#111111' },
    { nome: 'Veo 3.1', marca: 'Google · vídeo com som', href: '/video', escuro: true, tom: '#262626' },
    { nome: 'Seedance 2.5', marca: 'ByteDance · até 30 s', href: '/video', escuro: true, tom: '#3a3a3a' },
];

const PRESETS = [
    { nome: 'Foto de produto', texto: 'Fundo limpo e luz de estúdio', icone: 'produto', href: `/imagem?${q({ prompt: 'Fotografia de produto de [seu produto] sobre fundo off-white, luz suave de estúdio, sombra delicada, alta definição' })}` },
    { nome: 'Retrato editorial', texto: 'Luz natural, pele realista', icone: 'retrato', href: `/imagem?${q({ prompt: 'Retrato editorial de [pessoa], luz natural de janela, fundo neutro, pele realista, lente 85mm' })}` },
    { nome: 'Avatar falante', texto: 'Uma foto e um áudio viram vídeo', icone: 'rosto', href: '/lipsync' },
    { nome: 'Câmera orbital', texto: 'Gira em volta do produto', icone: 'orbita', href: `/video?${q({ prompt: 'A câmera gira devagar em volta de [seu produto] sobre uma mesa clara, reflexos suaves' })}` },
    { nome: 'Cena de cinema', texto: 'Câmera, lente e abertura reais', icone: 'camera', href: '/cinema' },
    { nome: 'Animar uma foto', texto: 'Dê movimento a uma imagem', icone: 'video', href: `/video?${q({ modo: 'imagem' })}` },
    { nome: 'Voz em português', texto: 'Texto vira fala natural', icone: 'som', href: '/audio' },
    { nome: 'Remover fundo', texto: 'Recorte limpo em um toque', icone: 'faisca', href: `/ferramentas?${q({ ferramenta: 'recraft-fundo' })}` },
    { nome: 'Ampliar para 4K', texto: 'Mais nitidez em imagem e vídeo', icone: 'ampliar', href: '/ferramentas' },
];

export default function Explorar() {
    const router = useRouter();
    const { itens } = useHistorico();
    const [tipo, setTipo] = useState('imagem');
    const [texto, setTexto] = useState('');
    const prontos = itens.filter((i) => i.estado === 'pronto' && i.midia !== 'audio');
    const recentes = prontos.slice(0, 6);
    const [aberto, setAberto] = useState(null);

    const enviar = (e) => {
        e.preventDefault();
        router.push(`/${tipo}${texto.trim() ? `?${q({ prompt: texto.trim() })}` : ''}`);
    };

    return (
        <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-14 px-4 pb-28 pt-8 md:px-8 md:pb-16 md:pt-14">
            <section className="flex animate-subir flex-col items-center gap-6">
                <h1 className="text-center text-[30px] font-medium leading-[1.05] tracking-[-0.04em] md:text-[52px]">O que vamos criar hoje?</h1>
                <form onSubmit={enviar} className="flex w-full max-w-[760px] flex-col gap-3 rounded-[22px] border border-[rgba(17,17,17,0.14)] p-3.5 focus-within:border-tinta">
                    <label htmlFor="prompt-explorar" className="sr-only">Descreva o que quer criar</label>
                    <textarea id="prompt-explorar" rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) enviar(e); }} placeholder="Descreva uma imagem ou um vídeo..." className="resize-none bg-transparent px-1.5 py-1 text-[17px] leading-snug outline-none" />
                    <div className="flex flex-wrap items-center gap-2">
                        <div role="group" aria-label="Tipo de criação" className="flex rounded-full border border-linha p-[3px]">
                            {[['imagem', 'Imagem'], ['video', 'Vídeo']].map(([v, n]) => (
                                <button key={v} type="button" aria-pressed={tipo === v} onClick={() => setTipo(v)} className={`h-[34px] rounded-full px-3.5 text-[13px] ${tipo === v ? 'bg-tinta text-white' : 'text-cinza'}`}>{n}</button>
                            ))}
                        </div>
                        <span className="flex-1" />
                        <button type="submit" className="flex h-11 items-center gap-2 rounded-2xl bg-tinta px-5 text-sm font-medium text-white">Continuar<Icone nome="seta" tamanho={16} /></button>
                    </div>
                </form>
            </section>

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
