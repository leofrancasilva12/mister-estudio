'use client';

// Conversas: cada uma é um projeto, com imagens, vídeos e vozes juntos.
import { useEffect, useRef, useState } from 'react';
import Icone from './Icone';
import { useHistorico } from '@/lib/historico';

const quando = (ms) => {
    if (!ms) return '';
    const d = new Date(ms);
    const hoje = new Date();
    if (d.toDateString() === hoje.toDateString()) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

function Linha({ conversa, ativa, total, aoEscolher }) {
    const { renomearConversa, apagarConversa } = useHistorico();
    const [editando, setEditando] = useState(false);
    const [nome, setNome] = useState(conversa.nome);
    const [confirmar, setConfirmar] = useState(false);
    const campo = useRef(null);
    useEffect(() => { if (editando) campo.current?.select(); }, [editando]);
    useEffect(() => { setConfirmar(false); setEditando(false); setNome(conversa.nome); }, [ativa, conversa.nome]);

    const salvar = () => { renomearConversa(conversa.id, nome); setEditando(false); };

    if (editando) {
        return (
            <form onSubmit={(e) => { e.preventDefault(); salvar(); }} className="flex items-center gap-1 rounded-xl border border-tinta bg-white p-1">
                <label htmlFor={`nome-${conversa.id}`} className="sr-only">Nome da conversa</label>
                <input id={`nome-${conversa.id}`} ref={campo} value={nome} onChange={(e) => setNome(e.target.value)} onBlur={salvar} maxLength={60} className="h-9 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" />
            </form>
        );
    }

    return (
        <div className={`group rounded-xl ${ativa ? 'bg-white shadow-[0_0_0_1px_rgba(17,17,17,0.12)]' : 'hover:bg-white/70'}`}>
            <button type="button" onClick={aoEscolher} aria-current={ativa ? 'true' : undefined} className="flex min-h-[52px] w-full flex-col justify-center gap-0.5 px-3 py-2 text-left">
                <span className={`truncate text-sm ${ativa ? 'font-medium' : ''}`}>{conversa.nome}</span>
                <span className="text-[11px] text-cinza">{total} {total === 1 ? 'criação' : 'criações'} · {quando(conversa.atualizadaEm || conversa.criadaEm)}</span>
            </button>
            {ativa && (
                <div className="flex items-center gap-1 px-2 pb-2">
                    {confirmar ? (
                        <>
                            <button type="button" onClick={() => apagarConversa(conversa.id)} className="h-9 rounded-lg bg-alerta px-3 text-xs text-white">Apagar tudo</button>
                            <button type="button" onClick={() => setConfirmar(false)} className="h-9 px-2 text-xs">Cancelar</button>
                        </>
                    ) : (
                        <>
                            <button type="button" onClick={() => setEditando(true)} className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs text-cinza hover:text-tinta"><Icone nome="editar" tamanho={14} />Renomear</button>
                            <button type="button" onClick={() => setConfirmar(true)} className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs text-cinza hover:text-alerta"><Icone nome="lixeira" tamanho={14} />Apagar</button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export function ListaConversas({ aoEscolher, aoFechar }) {
    const { conversas, conversaAtual, novaConversa, selecionarConversa, itens } = useHistorico();
    const ordenadas = [...conversas].sort((a, b) => (b.atualizadaEm || b.criadaEm) - (a.atualizadaEm || a.criadaEm));
    const contar = (id) => itens.filter((i) => i.conversaId === id).length;
    return (
        <div className="flex h-full flex-col gap-3 p-3">
            <div className="flex items-center justify-between gap-2 px-1">
                <span className="text-sm font-medium">Conversas</span>
                {aoFechar && (
                    <button type="button" aria-label="Fechar conversas" onClick={aoFechar} className="flex h-10 w-10 items-center justify-center rounded-xl text-cinza hover:text-tinta">
                        <Icone nome="voltar" />
                    </button>
                )}
            </div>
            <button type="button" onClick={() => { novaConversa(); aoEscolher?.(); }} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-tinta text-sm font-medium text-white">
                <Icone nome="mais" tamanho={16} />Nova conversa
            </button>
            <nav aria-label="Lista de conversas" className="rolagem -mx-1 flex flex-1 flex-col gap-1 overflow-y-auto px-1">
                {ordenadas.length === 0 && <p className="px-2 py-4 text-xs leading-relaxed text-cinza">Suas conversas aparecem aqui. Cada uma guarda as imagens, vídeos e vozes de um projeto.</p>}
                {ordenadas.map((c) => (
                    <Linha key={c.id} conversa={c} ativa={c.id === conversaAtual?.id} total={contar(c.id)} aoEscolher={() => { selecionarConversa(c.id); aoEscolher?.(); }} />
                ))}
            </nav>
        </div>
    );
}

// Faixa no topo do feed: nome da conversa, abrir a lista e começar outra
export function TopoConversa({ aoAbrirLista, listaAberta }) {
    const { conversaAtual, novaConversa } = useHistorico();
    return (
        <div className="mb-4 flex items-center gap-2">
            {!listaAberta && (
                <button type="button" onClick={aoAbrirLista} aria-label="Abrir conversas" className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-linha">
                    <Icone nome="lista" tamanho={18} />
                </button>
            )}
            <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{conversaAtual?.nome || 'Nova conversa'}</span>
            <button type="button" onClick={novaConversa} className="flex h-10 flex-none items-center gap-1.5 rounded-xl border border-linha px-3 text-[13px]">
                <Icone nome="mais" tamanho={15} />Nova
            </button>
        </div>
    );
}
