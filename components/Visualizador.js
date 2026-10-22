'use client';

// Mídia em tela cheia, com detalhes e atalhos para continuar o trabalho.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icone from './Icone';
import { baixar } from '@/lib/api';
import { useHistorico, dataExpiracao } from '@/lib/historico';

const PAGINA = { imagem: '/imagem', video: '/video', lipsync: '/lipsync', cinema: '/cinema', audio: '/audio', ferramenta: '/ferramentas' };

function Atalho({ href, icone, children, aoClicar }) {
    const router = useRouter();
    return (
        <button type="button" onClick={() => (aoClicar ? aoClicar() : router.push(href))} className="flex min-h-12 items-center gap-2 rounded-xl border border-linha px-3 text-[13px] transition-colors hover:border-tinta/40">
            <Icone nome={icone} tamanho={16} />
            {children}
        </button>
    );
}

export default function Visualizador({ itens, id, aoMudar, aoFechar }) {
    const { alternarFavorito, remover, avisar } = useHistorico();
    const [confirmar, setConfirmar] = useState(false);
    const indice = Math.max(0, itens.findIndex((i) => i.id === id));
    const item = itens[indice];

    useEffect(() => {
        const tecla = (e) => {
            if (e.key === 'Escape') aoFechar();
            if (e.key === 'ArrowLeft' && indice > 0) aoMudar(itens[indice - 1].id);
            if (e.key === 'ArrowRight' && indice < itens.length - 1) aoMudar(itens[indice + 1].id);
        };
        document.addEventListener('keydown', tecla);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', tecla); document.body.style.overflow = ''; };
    }, [indice, itens, aoMudar, aoFechar]);

    useEffect(() => setConfirmar(false), [id]);

    if (!item) return null;
    const ehImagem = item.midia === 'imagem';
    const ehAudio = item.midia === 'audio';
    const ext = ehAudio ? 'mp3' : ehImagem ? (item.url.split('?')[0].match(/\.(png|jpe?g|webp)$/i)?.[1] || 'png') : 'mp4';
    const nomeArquivo = `estudio-${item.tipo}-${new Date(item.criadoEm).toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${ext}`;
    const expira = dataExpiracao(item);
    const q = (o) => new URLSearchParams(o).toString();

    const copiar = async () => {
        try { await navigator.clipboard.writeText(item.prompt || ''); avisar('Prompt copiado'); } catch { avisar('Não consegui copiar'); }
    };

    return (
        <div role="dialog" aria-modal="true" aria-label="Visualizador" className="fixed inset-0 z-50 flex animate-escurecer flex-col bg-white">
            <header className="flex items-center gap-2 border-b border-fina px-3 py-2.5 md:px-6">
                <button type="button" onClick={aoFechar} className="flex h-11 items-center gap-1 rounded-xl pl-1.5 pr-3 text-sm"><Icone nome="voltar" tamanho={20} />Voltar</button>
                <span className="flex-1" />
                <span className="font-mono text-xs text-cinza">{indice + 1} de {itens.length}</span>
                <button type="button" aria-label="Anterior" disabled={indice === 0} onClick={() => aoMudar(itens[indice - 1].id)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-linha disabled:opacity-30"><Icone nome="voltar" /></button>
                <button type="button" aria-label="Próximo" disabled={indice === itens.length - 1} onClick={() => aoMudar(itens[indice + 1].id)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-linha disabled:opacity-30"><Icone nome="avancar" /></button>
            </header>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
                <section aria-label="Mídia" className="flex flex-none items-center justify-center bg-fundo p-4 md:min-h-0 md:flex-1 md:p-10">
                    {ehAudio ? (
                        <div className="flex w-full max-w-lg animate-entrar flex-col items-center gap-6 rounded-3xl bg-white p-8">
                            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tinta text-white"><Icone nome="onda" tamanho={26} /></span>
                            <audio key={item.id} src={item.url} controls autoPlay className="w-full" />
                        </div>
                    ) : ehImagem ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={item.id} src={item.url} alt={item.prompt || ''} className="max-h-[60vh] max-w-full animate-entrar rounded-2xl object-contain md:max-h-full" />
                    ) : (
                        <video key={item.id} src={item.url} controls autoPlay playsInline loop className="max-h-[60vh] max-w-full animate-entrar rounded-2xl bg-tinta md:max-h-full" />
                    )}
                </section>
                <aside aria-label="Detalhes" className="rolagem flex flex-col gap-6 p-5 md:w-[380px] md:flex-none md:overflow-y-auto md:border-l md:border-fina md:p-6">
                    {item.prompt && (
                        <div className="flex flex-col gap-2.5">
                            <div className="flex items-center justify-between"><span className="text-xs text-cinza">Prompt</span><button type="button" onClick={copiar} className="flex h-9 items-center gap-1.5 rounded-full border border-linha px-3 text-xs"><Icone nome="copiar" tamanho={13} />Copiar</button></div>
                            <p className="text-[15px] leading-relaxed">{item.prompt}</p>
                        </div>
                    )}
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[13px]">
                        <dt className="text-cinza">Modelo</dt><dd>{item.modelo}</dd>
                        {item.detalhes && <><dt className="text-cinza">Ajustes</dt><dd>{item.detalhes.replace(`${item.modelo} · `, '')}</dd></>}
                        {item.creditos && <><dt className="text-cinza">Custo</dt><dd>{Number(item.creditos).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} créditos</dd></>}
                        <dt className="text-cinza">Criado</dt><dd>{new Date(item.criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</dd>
                        {expira && <><dt className="text-cinza">Expira no Kie.ai</dt><dd>{expira.toLocaleDateString('pt-BR')}</dd></>}
                    </dl>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => baixar(item.url, nomeArquivo)} className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl bg-tinta text-[15px] font-medium text-white"><Icone nome="baixar" />Baixar</button>
                        <button type="button" aria-label={item.favorito ? 'Tirar dos favoritos' : 'Favoritar'} aria-pressed={!!item.favorito} onClick={() => alternarFavorito(item.id)} className={`flex h-[50px] w-[50px] items-center justify-center rounded-2xl border ${item.favorito ? 'border-tinta bg-pedra' : 'border-linha'}`}><Icone nome="coracao" /></button>
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs text-cinza">Continuar a partir daqui</span>
                        <div className="grid grid-cols-2 gap-2">
                            {item.tipo === 'audio'
                                ? <Atalho icone="refazer" href={`/audio?${q({ texto: item.prompt || '' })}`}>Reusar texto</Atalho>
                                : item.prompt ? <Atalho icone="refazer" href={`${PAGINA[item.tipo] || '/imagem'}?${q({ prompt: item.promptOriginal || item.prompt || '' })}`}>Reusar prompt</Atalho> : null}
                            {ehAudio && <Atalho icone="rosto" href={`/lipsync?${q({ audio: item.url })}`}>Usar no Lip Sync</Atalho>}
                            {ehImagem && <Atalho icone="video" href={`/video?${q({ imagem: item.url })}`}>Animar</Atalho>}
                            {ehImagem && <Atalho icone="rosto" href={`/lipsync?${q({ imagem: item.url })}`}>Fazer falar</Atalho>}
                            {ehImagem && <Atalho icone="editar" href={`/imagem?${q({ ref: item.url })}`}>Editar</Atalho>}
                            {ehImagem && <Atalho icone="ampliar" href={`/ferramentas?${q({ ferramenta: 'topaz-imagem', imagem: item.url })}`}>Ampliar</Atalho>}
                            {ehImagem && <Atalho icone="faisca" href={`/ferramentas?${q({ ferramenta: 'recraft-fundo', imagem: item.url })}`}>Tirar fundo</Atalho>}
                            {item.midia === 'video' && <Atalho icone="ampliar" href={`/ferramentas?${q({ ferramenta: 'topaz-video', video: item.url })}`}>Ampliar vídeo</Atalho>}
                        </div>
                    </div>
                    <div className="flex-1" />
                    {confirmar ? (
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => { remover(item.id); aoFechar(); }} className="h-11 rounded-xl bg-alerta px-4 text-sm text-white">Excluir de vez</button>
                            <button type="button" onClick={() => setConfirmar(false)} className="h-11 px-3 text-sm">Cancelar</button>
                        </div>
                    ) : (
                        <button type="button" onClick={() => setConfirmar(true)} className="h-11 self-start text-sm text-alerta">Excluir da biblioteca</button>
                    )}
                </aside>
            </div>
        </div>
    );
}
