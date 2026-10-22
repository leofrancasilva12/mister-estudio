'use client';

// Esqueleto das telas de criação:
// computador = painel à esquerda + feed à direita; celular = feed + barra de criação + gaveta de ajustes.
import { useEffect, useState } from 'react';
import Icone from './Icone';
import { BotaoGerar, CampoPrompt } from './Controles';

export function useEhCelular() {
    const [celular, setCelular] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)');
        const mudar = () => setCelular(mq.matches);
        mudar();
        mq.addEventListener('change', mudar);
        return () => mq.removeEventListener('change', mudar);
    }, []);
    return celular;
}

export default function Criador({ rotulo, topo, prompt, opcoes, resumo, gerar, feed }) {
    const celular = useEhCelular();
    const [gaveta, setGaveta] = useState(false);

    useEffect(() => {
        if (!gaveta) return;
        const esc = (e) => e.key === 'Escape' && setGaveta(false);
        document.addEventListener('keydown', esc);
        return () => document.removeEventListener('keydown', esc);
    }, [gaveta]);

    if (!celular) {
        return (
            <div className="flex items-start">
                <aside aria-label={rotulo} className="rolagem sticky top-[65px] flex h-[calc(100vh-65px)] w-[380px] flex-none flex-col gap-5 overflow-y-auto border-r border-fina p-5 lg:w-[400px]">
                    {topo}
                    {prompt && <CampoPrompt {...prompt} />}
                    {opcoes}
                    <BotaoGerar {...gerar} />
                </aside>
                <main className="min-w-0 flex-1 px-5 pb-12 pt-5 lg:px-7">{feed}</main>
            </div>
        );
    }

    const gerarEFechar = () => { gerar.aoGerar(); setGaveta(false); };

    return (
        <>
            <main className="px-4 pb-[260px] pt-3">{feed}</main>
            <div className="fixed inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom))] z-20 flex flex-col gap-2 rounded-[20px] border border-[rgba(17,17,17,0.14)] bg-white p-2.5 shadow-[0_8px_24px_rgba(17,17,17,0.08)]">
                {prompt && (
                    <>
                        <label htmlFor="prompt-celular" className="sr-only">{prompt.rotulo || 'Prompt'}</label>
                        <textarea id="prompt-celular" rows={2} maxLength={prompt.max || 5000} value={prompt.valor} onChange={(e) => prompt.aoMudar(e.target.value)} placeholder={prompt.placeholder} className="resize-none bg-transparent px-1 py-0.5 text-[15px] leading-snug outline-none" />
                    </>
                )}
                <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setGaveta(true)} className="flex h-10 min-w-0 flex-1 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-xl border border-linha px-2.5 text-xs">
                        <Icone nome="ajustes" tamanho={15} className="flex-none" />
                        <span className="truncate">{resumo}</span>
                    </button>
                    <button type="button" onClick={gerar.aoGerar} disabled={gerar.desativado} className="h-10 flex-none rounded-xl bg-tinta px-4 text-sm font-medium text-white disabled:opacity-35">Gerar</button>
                </div>
            </div>
            {gaveta && (
                <div className="fixed inset-0 z-40 flex flex-col justify-end">
                    <button type="button" aria-label="Fechar ajustes" onClick={() => setGaveta(false)} className="min-h-[60px] flex-1 animate-escurecer bg-black/30" />
                    <section aria-label="Ajustes" className="rolagem flex max-h-[85vh] animate-gaveta flex-col gap-4 overflow-y-auto rounded-t-3xl bg-white px-4 pb-[calc(20px+env(safe-area-inset-bottom))] pt-2">
                        <span aria-hidden="true" className="mx-auto block h-1 w-9 flex-none rounded bg-black/20" />
                        <div className="flex items-center justify-between">
                            <h2 className="text-[17px] font-medium">Ajustes</h2>
                            <button type="button" onClick={() => setGaveta(false)} className="h-10 px-3 text-sm">Pronto</button>
                        </div>
                        {topo}
                        {opcoes}
                        <BotaoGerar {...gerar} aoGerar={gerarEFechar} />
                    </section>
                </div>
            )}
        </>
    );
}
