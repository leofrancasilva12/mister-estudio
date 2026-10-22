'use client';

// Peças de controle reaproveitadas em todas as telas de criação.
import { useEffect, useId, useRef, useState } from 'react';
import Icone from './Icone';
import { formaProporcao, rotuloProporcao } from '@/lib/modelos';
import { enviarArquivo } from '@/lib/api';

export function Campo({ rotulo, extra, children, htmlFor }) {
    return (
        <div className="flex flex-col gap-2">
            {(rotulo || extra) && (
                <div className="flex items-baseline justify-between gap-2">
                    {htmlFor ? <label htmlFor={htmlFor} className="text-xs text-cinza">{rotulo}</label> : <span className="text-xs text-cinza">{rotulo}</span>}
                    {extra}
                </div>
            )}
            {children}
        </div>
    );
}

// Botões lado a lado, um escolhido (ex.: 1K / 2K / 4K)
export function Segmentado({ opcoes, valor, aoMudar, rotulo }) {
    return (
        <div role="group" aria-label={rotulo} className="grid rounded-xl border border-linha p-[3px]" style={{ gridTemplateColumns: `repeat(${opcoes.length}, minmax(0, 1fr))` }}>
            {opcoes.map(([v, nome]) => {
                const ativo = v === valor;
                return (
                    <button key={String(v)} type="button" aria-pressed={ativo} onClick={() => aoMudar(v)} className={`h-[38px] rounded-[9px] text-[13px] transition-colors ${ativo ? 'bg-tinta text-white' : 'text-[#3d3d3d] hover:bg-pedra'}`}>
                        {nome}
                    </button>
                );
            })}
        </div>
    );
}

// Pílulas que quebram linha (ex.: movimentos de câmera)
export function Pilulas({ opcoes, valor, aoMudar, rotulo }) {
    return (
        <div role="group" aria-label={rotulo} className="flex flex-wrap gap-1.5">
            {opcoes.map(([v, nome]) => {
                const ativo = v === valor;
                return (
                    <button key={v} type="button" aria-pressed={ativo} onClick={() => aoMudar(v)} className={`min-h-10 rounded-full border px-3 text-[13px] transition-colors ${ativo ? 'border-tinta bg-tinta text-white' : 'border-linha text-[#3d3d3d] hover:border-tinta/40'}`}>
                        {nome}
                    </button>
                );
            })}
        </div>
    );
}

export function Proporcoes({ opcoes, valor, aoMudar }) {
    return (
        <div role="group" aria-label="Proporção" className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-4">
            {opcoes.map((p) => {
                const ativo = p === valor;
                const [w, h] = formaProporcao(p);
                return (
                    <button key={p} type="button" aria-pressed={ativo} onClick={() => aoMudar(p)} className={`flex h-[52px] flex-col items-center justify-center gap-1.5 rounded-[10px] border text-xs transition-colors ${ativo ? 'border-tinta bg-tinta text-white' : 'border-linha text-[#3d3d3d] hover:border-tinta/40'}`}>
                        <span aria-hidden="true" className="block rounded-[2px] border border-current" style={{ width: w, height: h }} />
                        {rotuloProporcao(p)}
                    </button>
                );
            })}
        </div>
    );
}

export function Interruptor({ ligado, aoMudar, titulo, texto }) {
    return (
        <button type="button" role="switch" aria-checked={ligado} onClick={() => aoMudar(!ligado)} className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-linha px-3.5 text-left">
            <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm">{titulo}</span>
                {texto && <span className="text-xs text-cinza">{texto}</span>}
            </span>
            <span aria-hidden="true" className={`flex h-6 w-10 flex-none rounded-full p-0.5 transition-colors ${ligado ? 'justify-end bg-tinta' : 'justify-start bg-[#d6d6d2]'}`}>
                <span className="h-5 w-5 rounded-full bg-white" />
            </span>
        </button>
    );
}

// Lista de modelos que abre e fecha
export function SeletorModelo({ modelos, valor, aoMudar, iconeEscuro = false }) {
    const [aberto, setAberto] = useState(false);
    const atual = modelos.find((m) => m.id === valor) || modelos[0];
    const caixa = useRef(null);
    useEffect(() => {
        if (!aberto) return;
        const fora = (e) => { if (caixa.current && !caixa.current.contains(e.target)) setAberto(false); };
        document.addEventListener('pointerdown', fora);
        return () => document.removeEventListener('pointerdown', fora);
    }, [aberto]);
    return (
        <div ref={caixa} className="flex flex-col gap-2">
            <button type="button" aria-expanded={aberto} onClick={() => setAberto((a) => !a)} className="flex min-h-14 items-center gap-3 rounded-2xl border border-[rgba(17,17,17,0.14)] py-2 pl-2 pr-3 text-left transition-colors hover:border-tinta/40">
                <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-[10px] text-[15px] font-medium ${iconeEscuro ? 'bg-tinta text-white' : 'bg-pedra'}`}>
                    {iconeEscuro ? <Icone nome="play" tamanho={15} /> : atual.nome.charAt(0)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium">{atual.nome}</span>
                    <span className="text-xs text-cinza">{atual.marca || atual.detalhe}</span>
                </span>
                <Icone nome="baixo" tamanho={16} className={`transition-transform ${aberto ? 'rotate-180' : ''}`} />
            </button>
            {aberto && (
                <div className="rolagem flex max-h-[300px] animate-subir flex-col gap-0.5 overflow-y-auto rounded-2xl border border-linha p-1.5">
                    {modelos.map((m) => (
                        <button key={m.id} type="button" onClick={() => { aoMudar(m.id); setAberto(false); }} className={`flex min-h-[52px] items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left ${m.id === atual.id ? 'bg-pedra' : 'hover:bg-[#fafaf9]'}`}>
                            <span className="flex flex-1 flex-col gap-0.5">
                                <span className="text-sm font-medium">{m.nome}</span>
                                <span className="text-xs text-cinza">{m.marca || m.detalhe}</span>
                            </span>
                            {m.selo && <span className="rounded-full border border-linha px-2 py-0.5 text-[11px] text-cinza">{m.selo}</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export function CampoPrompt({ valor, aoMudar, placeholder, linhas = 4, max = 5000, rotulo = 'Prompt', acoes }) {
    const id = useId();
    return (
        <Campo rotulo={rotulo} htmlFor={id} extra={<span className="font-mono text-[11px] text-suave">{valor.length} / {max}</span>}>
            <div className="flex flex-col gap-2.5 rounded-2xl border border-[rgba(17,17,17,0.14)] p-3 focus-within:border-tinta">
                <textarea id={id} rows={linhas} maxLength={max} value={valor} onChange={(e) => aoMudar(e.target.value)} placeholder={placeholder} className="w-full resize-y bg-transparent text-[15px] leading-relaxed outline-none" />
                {acoes}
            </div>
        </Campo>
    );
}

// Enviar um ou mais arquivos. Cada item: { url, nome, previa, progresso, erro }
export function useEnvios(maximo = 1) {
    const [itens, setItens] = useState([]);
    const adicionar = async (arquivos) => {
        const vagas = maximo === 1 ? 1 : maximo - itens.filter((i) => !i.erro).length;
        const lista = Array.from(arquivos).slice(0, Math.max(0, vagas));
        if (!lista.length) return;
        const novos = lista.map((f) => ({ chave: `${f.name}-${f.size}-${Math.random()}`, nome: f.name, tipo: f.type, previa: URL.createObjectURL(f), progresso: 0, arquivo: f }));
        setItens((atual) => (maximo === 1 ? novos : [...atual.filter((i) => !i.erro), ...novos]));
        for (const n of novos) {
            try {
                const url = await enviarArquivo(n.arquivo, (p) => setItens((atual) => atual.map((i) => (i.chave === n.chave ? { ...i, progresso: p } : i))));
                setItens((atual) => atual.map((i) => (i.chave === n.chave ? { ...i, url, progresso: 100 } : i)));
            } catch (e) {
                setItens((atual) => atual.map((i) => (i.chave === n.chave ? { ...i, erro: e.message } : i)));
            }
        }
    };
    const definirUrl = (url, nome = 'Da biblioteca', tipo = 'image/') => setItens([{ chave: url, nome, tipo, previa: url, url, progresso: 100 }]);
    const remover = (chave) => setItens((atual) => atual.filter((i) => i.chave !== chave));
    const limpar = () => setItens([]);
    const urls = itens.filter((i) => i.url).map((i) => i.url);
    const enviando = itens.some((i) => !i.url && !i.erro);
    return { itens, adicionar, remover, limpar, definirUrl, urls, enviando };
}

const LIMITES_MB = { image: 10, audio: 10, video: 50 };

function validar(arquivos, aceita, avisar) {
    const ok = [];
    for (const f of arquivos) {
        const tipo = (f.type || '').split('/')[0];
        const limite = LIMITES_MB[tipo];
        if (!limite || !aceita.split(',').some((a) => f.type.startsWith(a.replace('*', '')))) { avisar?.(`"${f.name}" não é um tipo aceito aqui.`); continue; }
        if (f.size > limite * 1024 * 1024) { avisar?.(`"${f.name}" passa de ${limite} MB.`); continue; }
        ok.push(f);
    }
    return ok;
}

export function Referencias({ envios, maximo, avisar, rotulo }) {
    const entrada = useRef(null);
    const cheios = envios.itens.filter((i) => !i.erro).length >= maximo;
    return (
        <Campo rotulo={rotulo || `Referências (até ${maximo})`}>
            <div className="flex flex-wrap gap-2">
                {envios.itens.map((i) => (
                    <div key={i.chave} className="relative h-14 w-14">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={i.previa} alt={i.nome} className={`h-14 w-14 rounded-xl object-cover ${i.url ? '' : 'opacity-40'}`} />
                        {!i.url && !i.erro && <span className="absolute inset-x-1.5 bottom-1.5 h-0.5 overflow-hidden rounded bg-black/10"><span className="block h-full bg-tinta transition-all" style={{ width: `${i.progresso}%` }} /></span>}
                        {i.erro && <span title={i.erro} className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80 text-alerta"><Icone nome="aviso" tamanho={16} /></span>}
                        <button type="button" aria-label={`Remover ${i.nome}`} onClick={() => envios.remover(i.chave)} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-tinta text-white">
                            <Icone nome="x" tamanho={11} largura={2} />
                        </button>
                    </div>
                ))}
                {!cheios && (
                    <button type="button" aria-label="Adicionar referência" onClick={() => entrada.current?.click()} className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-black/30 hover:border-tinta">
                        <Icone nome="mais" />
                    </button>
                )}
                <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp" multiple={maximo > 1} hidden onChange={(e) => { envios.adicionar(validar(e.target.files, 'image/', avisar)); e.target.value = ''; }} />
            </div>
        </Campo>
    );
}

// Um arquivo só (quadro inicial, retrato, áudio, vídeo)
export function SlotArquivo({ envios, aceita, rotulo, vazio, avisar, proporcao = '16 / 10' }) {
    const entrada = useRef(null);
    const item = envios.itens[0];
    const tipo = (item?.tipo || '').split('/')[0];
    return (
        <Campo rotulo={rotulo}>
            {item ? (
                <div className="relative flex items-center gap-3 rounded-2xl border border-linha p-2">
                    {tipo === 'image' && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.previa} alt="" className="h-14 w-14 flex-none rounded-[10px] object-cover" />
                    )}
                    {tipo === 'video' && <video src={item.previa} muted playsInline className="h-14 w-14 flex-none rounded-[10px] bg-tinta object-cover" />}
                    {tipo === 'audio' && <span className="flex h-14 w-14 flex-none items-center justify-center rounded-[10px] bg-tinta text-white"><Icone nome="onda" /></span>}
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="truncate text-sm">{item.nome}</span>
                        {item.erro ? <span className="text-xs text-alerta">{item.erro}</span> : item.url ? <span className="text-xs text-cinza">Pronto para usar</span> : (
                            <span className="h-0.5 overflow-hidden rounded bg-black/10"><span className="block h-full bg-tinta transition-all" style={{ width: `${item.progresso}%` }} /></span>
                        )}
                        {tipo === 'audio' && item.url && <audio src={item.previa} controls className="h-8 w-full" />}
                    </span>
                    <button type="button" onClick={() => entrada.current?.click()} className="h-10 flex-none rounded-[10px] border border-linha px-3 text-[13px]">Trocar</button>
                </div>
            ) : (
                <button type="button" onClick={() => entrada.current?.click()} className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-black/30 text-[13px] text-cinza transition-colors hover:border-tinta hover:text-tinta" style={{ aspectRatio: proporcao }}>
                    <Icone nome="mais" />
                    {vazio}
                </button>
            )}
            <input ref={entrada} type="file" accept={aceita} hidden onChange={(e) => { envios.adicionar(validar(e.target.files, aceita, avisar)); e.target.value = ''; }} />
        </Campo>
    );
}

export function BotaoGerar({ rotulo, aoGerar, desativado, motivo }) {
    return (
        <div className="flex flex-col gap-2">
            <button type="button" onClick={aoGerar} disabled={desativado} className="flex h-[54px] items-center justify-between rounded-2xl bg-tinta px-[18px] text-[15px] font-medium text-white transition-opacity disabled:opacity-35">
                <span>{rotulo}</span>
                <Icone nome="seta" />
            </button>
            {desativado && motivo && <span className="text-xs text-cinza">{motivo}</span>}
        </div>
    );
}
