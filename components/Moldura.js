'use client';

// Moldura de todas as telas: cabeçalho, barra inferior no celular e avisos.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Icone, { Logo } from './Icone';
import { lerCreditos } from '@/lib/api';
import { useHistorico } from '@/lib/historico';

export const SECOES = [
    { href: '/', nome: 'Explorar', icone: 'explorar' },
    { href: '/imagem', nome: 'Imagem', icone: 'imagem' },
    { href: '/video', nome: 'Vídeo', icone: 'video' },
    { href: '/lipsync', nome: 'Lip Sync', icone: 'rosto' },
    { href: '/audio', nome: 'Áudio', icone: 'som' },
    { href: '/cinema', nome: 'Cinema', icone: 'camera' },
    { href: '/ferramentas', nome: 'Ferramentas', icone: 'ampliar' },
    { href: '/biblioteca', nome: 'Biblioteca', icone: 'grade' },
];

const ativa = (caminho, href) => (href === '/' ? caminho === '/' : caminho.startsWith(href));

export async function sair() {
    try { await fetch('/api/sair', { method: 'POST' }); } catch { /* segue mesmo assim */ }
    window.location.href = '/login';
}

function MenuConta() {
    const [aberto, setAberto] = useState(false);
    useEffect(() => {
        if (!aberto) return;
        const fechar = (e) => { if (!e.target.closest?.('[data-menu-conta]')) setAberto(false); };
        const esc = (e) => e.key === 'Escape' && setAberto(false);
        document.addEventListener('pointerdown', fechar);
        document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('pointerdown', fechar); document.removeEventListener('keydown', esc); };
    }, [aberto]);
    return (
        <div data-menu-conta className="relative">
            <button type="button" aria-label="Conta" aria-expanded={aberto} onClick={() => setAberto((a) => !a)} className="flex h-11 w-11 items-center justify-center rounded-full border border-linha text-sm font-medium">L</button>
            {aberto && (
                <div className="absolute right-0 top-[52px] z-40 w-56 animate-subir rounded-2xl border border-linha bg-white p-1.5 shadow-[0_12px_32px_rgba(17,17,17,0.10)]">
                    <span className="block px-3 py-2 text-xs text-cinza">Conectado como leo</span>
                    <button type="button" onClick={sair} className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-sm hover:bg-pedra"><Icone nome="sair" tamanho={17} />Sair da conta</button>
                </div>
            )}
        </div>
    );
}

function Creditos() {
    const [valor, setValor] = useState(null);
    const { itens } = useHistorico();
    const prontos = itens.filter((i) => i.estado === 'pronto').length;
    useEffect(() => {
        let vivo = true;
        lerCreditos().then((c) => vivo && setValor(c)).catch(() => {});
        return () => { vivo = false; };
    }, [prontos]);
    if (valor === null) return null;
    return (
        <span title="Créditos do Kie.ai" className="flex h-9 items-center gap-2 rounded-full border border-linha px-3 font-mono text-xs text-[#3d3d3d]">
            <Icone nome="moeda" tamanho={14} />
            {Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
        </span>
    );
}

export function Cabecalho() {
    const caminho = usePathname();
    return (
        <header className="sticky top-0 z-30 flex items-center gap-x-6 gap-y-2 border-b border-fina bg-white/95 px-4 py-2.5 backdrop-blur md:px-8">
            <Link href="/" className="flex min-h-11 items-center gap-2.5">
                <Logo />
                <span className="text-base font-medium tracking-tight">Estúdio</span>
            </Link>
            <nav aria-label="Seções do estúdio" className="sem-barra hidden min-w-0 flex-1 gap-0.5 overflow-x-auto md:flex">
                {SECOES.map((s) => {
                    const atual = ativa(caminho, s.href);
                    return (
                        <Link
                            key={s.href}
                            href={s.href}
                            aria-current={atual ? 'page' : undefined}
                            className={`flex h-11 flex-none items-center rounded-full px-3.5 text-sm transition-colors ${atual ? 'bg-pedra font-medium' : 'text-cinza hover:text-tinta'}`}
                        >
                            {s.nome}
                        </Link>
                    );
                })}
            </nav>
            <div className="ml-auto flex items-center gap-2.5">
                <Creditos />
                <MenuConta />
            </div>
        </header>
    );
}

export function NavInferior() {
    const caminho = usePathname();
    const [mais, setMais] = useState(false);
    useEffect(() => setMais(false), [caminho]);
    const principais = [SECOES[0], SECOES[1], SECOES[2]];
    const extras = [SECOES[3], SECOES[4], SECOES[5], SECOES[6]];
    const maisAtivo = extras.some((s) => ativa(caminho, s.href));
    const item = (s) => {
        const atual = ativa(caminho, s.href);
        return (
            <Link key={s.href} href={s.href} aria-current={atual ? 'page' : undefined} className={`flex min-h-[52px] flex-col items-center justify-center gap-1 text-[11px] ${atual ? 'font-medium text-tinta' : 'text-cinza'}`}>
                <Icone nome={s.icone} tamanho={22} />
                {s.nome}
            </Link>
        );
    };
    return (
        <>
            {mais && (
                <div className="fixed inset-0 z-40 flex flex-col justify-end md:hidden">
                    <button type="button" aria-label="Fechar" onClick={() => setMais(false)} className="flex-1 animate-escurecer bg-black/30" />
                    <div className="animate-gaveta rounded-t-3xl bg-white px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-2">
                        <span aria-hidden="true" className="mx-auto mb-3 block h-1 w-9 rounded bg-black/20" />
                        <div className="grid grid-cols-2 gap-2.5">
                            {extras.map((s) => (
                                <Link key={s.href} href={s.href} className="flex min-h-[88px] flex-col justify-between rounded-2xl border border-fina p-3.5">
                                    <Icone nome={s.icone} tamanho={22} />
                                    <span className="text-sm font-medium">{s.nome}</span>
                                </Link>
                            ))}
                        </div>
                        <button type="button" onClick={sair} className="mt-2.5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-fina text-sm text-alerta"><Icone nome="sair" tamanho={17} />Sair da conta</button>
                    </div>
                </div>
            )}
            <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-fina bg-white px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-1.5 md:hidden">
                {principais.map(item)}
                <button type="button" onClick={() => setMais(true)} aria-expanded={mais} className={`flex min-h-[52px] flex-col items-center justify-center gap-1 text-[11px] ${maisAtivo ? 'font-medium text-tinta' : 'text-cinza'}`}>
                    <Icone nome="pontos" tamanho={22} />
                    Mais
                </button>
                {item(SECOES[7])}
            </nav>
        </>
    );
}

export function Aviso() {
    const { aviso } = useHistorico();
    if (!aviso) return null;
    return (
        <div role="status" key={aviso.id} className="fixed left-1/2 top-16 z-50 -translate-x-1/2 animate-subir rounded-full bg-tinta px-4 py-2.5 text-sm text-white shadow-lg">
            {aviso.texto}
        </div>
    );
}
