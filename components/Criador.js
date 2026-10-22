'use client';

// Esqueleto das telas de criação:
// computador = painel à esquerda + feed à direita; celular = feed + barra de criação + gaveta de ajustes.
import { useEffect, useState } from 'react';
import Icone from './Icone';
import { BotaoGerar, BotoesMelhorar, CampoPrompt, FaixaAnexos, useMelhorar } from './Controles';
import { ListaConversas, TopoConversa } from './Conversas';
import { useHistorico } from '@/lib/historico';
import { formatarCreditos } from '@/lib/custos';

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

// Colar (Ctrl+V) e arrastar arquivos para a tela inteira
function useArquivosDeFora(aoSoltar) {
    const [arrastando, setArrastando] = useState(false);
    useEffect(() => {
        if (!aoSoltar) return;
        const colar = (e) => {
            const arquivos = Array.from(e.clipboardData?.files || []);
            if (arquivos.length) { e.preventDefault(); aoSoltar(arquivos); }
        };
        let contador = 0;
        const entrar = (e) => { if (e.dataTransfer?.types?.includes('Files')) { contador += 1; setArrastando(true); } };
        const sair = () => { contador = Math.max(0, contador - 1); if (!contador) setArrastando(false); };
        const sobre = (e) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault(); };
        const soltar = (e) => {
            if (!e.dataTransfer?.files?.length) return;
            e.preventDefault();
            contador = 0;
            setArrastando(false);
            aoSoltar(Array.from(e.dataTransfer.files));
        };
        document.addEventListener('paste', colar);
        document.addEventListener('dragenter', entrar);
        document.addEventListener('dragleave', sair);
        document.addEventListener('dragover', sobre);
        document.addEventListener('drop', soltar);
        return () => {
            document.removeEventListener('paste', colar);
            document.removeEventListener('dragenter', entrar);
            document.removeEventListener('dragleave', sair);
            document.removeEventListener('dragover', sobre);
            document.removeEventListener('drop', soltar);
        };
    }, [aoSoltar]);
    return arrastando;
}

export default function Criador({ rotulo, topo, prompt, opcoes, resumo, gerar: gerarPagina, feed, anexos = [], aoAnexar, rotuloAnexar = 'Anexar imagem', aoSoltar }) {
    const celular = useEhCelular();
    const [gaveta, setGaveta] = useState(false);
    const { saldo } = useHistorico();
    // O custo aprendido mora no aparelho: só mostra depois de montar, para o servidor e o navegador desenharem igual
    const [montado, setMontado] = useState(false);
    useEffect(() => { setMontado(true); }, []);
    // Bloqueia antes de gastar quando a estimativa passa do saldo
    const custo = montado ? gerarPagina.custo : null;
    const semSaldo = custo?.valor != null && saldo != null && custo.valor > saldo;
    const gerar = semSaldo
        ? { ...gerarPagina, custo, desativado: true, motivo: `Saldo insuficiente: precisa de ${formatarCreditos(custo.valor)} e você tem ${formatarCreditos(saldo)}. Recarregue no painel do Kie.ai.` }
        : { ...gerarPagina, custo };
    const [lista, setLista] = useState(true);
    const [listaCelular, setListaCelular] = useState(false);
    useEffect(() => { try { setLista(localStorage.getItem('mister-estudio:lista') !== 'fechada'); } catch { /* sem armazenamento */ } }, []);
    const mudarLista = (aberta) => { setLista(aberta); try { localStorage.setItem('mister-estudio:lista', aberta ? 'aberta' : 'fechada'); } catch { /* sem armazenamento */ } };
    const arrastando = useArquivosDeFora(aoSoltar);
    const melhoria = useMelhorar({ valor: prompt?.valor || '', aoMudar: prompt?.aoMudar || (() => {}), melhorar: prompt?.melhorar });

    useEffect(() => {
        if (!gaveta) return;
        const esc = (e) => e.key === 'Escape' && setGaveta(false);
        document.addEventListener('keydown', esc);
        return () => document.removeEventListener('keydown', esc);
    }, [gaveta]);

    const camada = arrastando && (
        <div className="pointer-events-none fixed inset-0 z-50 flex animate-escurecer items-center justify-center bg-white/85">
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-tinta px-10 py-8 text-sm">
                <Icone nome="mais" tamanho={26} />
                Solte para anexar
            </div>
        </div>
    );

    if (!celular) {
        return (
            <div className="flex items-start">
                {camada}
                {lista && (
                    <aside aria-label="Conversas" className="sticky top-[65px] h-[calc(100vh-65px)] w-[248px] flex-none animate-escurecer border-r border-fina bg-[#fafaf9]">
                        <ListaConversas aoFechar={() => mudarLista(false)} />
                    </aside>
                )}
                <aside aria-label={rotulo} className="rolagem sticky top-[65px] flex h-[calc(100vh-65px)] w-[380px] flex-none flex-col gap-5 overflow-y-auto border-r border-fina p-5 lg:w-[400px]">
                    {topo}
                    {prompt && <CampoPrompt {...prompt} />}
                    {opcoes}
                    <BotaoGerar {...gerar} />
                    {aoSoltar && <span className="-mt-2 text-center text-xs text-suave">Dica: arraste ou cole (Ctrl+V) uma imagem aqui</span>}
                </aside>
                <main className="min-w-0 flex-1 px-5 pb-12 pt-5 lg:px-7"><TopoConversa listaAberta={lista} aoAbrirLista={() => mudarLista(true)} />{feed}</main>
            </div>
        );
    }

    const gerarEFechar = () => { gerar.aoGerar(); setGaveta(false); };

    return (
        <>
            <main className="px-4 pb-[300px] pt-3"><TopoConversa listaAberta={false} aoAbrirLista={() => setListaCelular(true)} />{feed}</main>
            {listaCelular && (
                <div className="fixed inset-0 z-40 flex">
                    <aside aria-label="Conversas" className="h-full w-[85%] max-w-[320px] animate-lateral bg-[#fafaf9] pt-[env(safe-area-inset-top)]">
                        <ListaConversas aoEscolher={() => setListaCelular(false)} aoFechar={() => setListaCelular(false)} />
                    </aside>
                    <button type="button" aria-label="Fechar conversas" onClick={() => setListaCelular(false)} className="flex-1 animate-escurecer bg-black/30" />
                </div>
            )}
            <div className="fixed inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom))] z-20 flex flex-col gap-2 rounded-[20px] border border-[rgba(17,17,17,0.14)] bg-white p-2.5 shadow-[0_8px_24px_rgba(17,17,17,0.08)]">
                <FaixaAnexos grupos={anexos} />
                {prompt && (
                    <>
                        <label htmlFor="prompt-celular" className="sr-only">{prompt.rotulo || 'Prompt'}</label>
                        <textarea id="prompt-celular" rows={2} maxLength={prompt.max || 5000} value={prompt.valor} onChange={(e) => prompt.aoMudar(e.target.value)} placeholder={prompt.placeholder} className="resize-none bg-transparent px-1 py-0.5 text-[15px] leading-snug outline-none" />
                    </>
                )}
                <div className="flex items-center gap-1.5">
                    {aoAnexar && (
                        <button type="button" aria-label={rotuloAnexar} onClick={aoAnexar} className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-linha">
                            <Icone nome="mais" />
                        </button>
                    )}
                    {prompt?.melhorar && <BotoesMelhorar m={melhoria} compacto />}
                    <button type="button" onClick={() => setGaveta(true)} className="flex h-10 min-w-0 flex-1 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-xl border border-linha px-2.5 text-xs">
                        <Icone nome="ajustes" tamanho={15} className="flex-none" />
                        <span className="truncate">{resumo}</span>
                    </button>
                    <button type="button" onClick={gerar.aoGerar} disabled={gerar.desativado} className="flex h-10 flex-none items-center gap-1.5 rounded-xl bg-tinta px-4 text-sm font-medium text-white disabled:opacity-35">
                        Gerar{custo?.valor != null && <span className="font-mono text-[11px] font-normal text-ouro">{formatarCreditos(custo.valor)}</span>}
                    </button>
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
