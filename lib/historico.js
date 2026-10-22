'use client';

// Guarda tudo o que foi gerado neste aparelho e acompanha as tarefas em andamento.
// (A galeria compartilhada entre aparelhos vem depois, com o Supabase.)

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { consultarTarefa, criarTarefa } from './api';

const CHAVE = 'mister-estudio:historico:v1';
const LIMITE = 400;
const Ctx = createContext(null);

function carregar() {
    try {
        const bruto = localStorage.getItem(CHAVE);
        const lista = bruto ? JSON.parse(bruto) : [];
        return Array.isArray(lista) ? lista : [];
    } catch {
        return [];
    }
}

function salvar(lista) {
    try { localStorage.setItem(CHAVE, JSON.stringify(lista.slice(0, LIMITE))); } catch { /* armazenamento cheio ou bloqueado */ }
}

const novoId = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export function ProvedorHistorico({ children }) {
    const [itens, setItens] = useState([]);
    const [pronto, setPronto] = useState(false);
    const [aviso, setAviso] = useState(null);
    const itensRef = useRef(itens);
    itensRef.current = itens;

    useEffect(() => { setItens(carregar()); setPronto(true); }, []);
    useEffect(() => { if (pronto) salvar(itens); }, [itens, pronto]);

    const atualizar = useCallback((id, mudancas) => {
        setItens((lista) => lista.map((i) => (i.id === id ? { ...i, ...mudancas } : i)));
    }, []);

    const avisar = useCallback((texto) => {
        setAviso({ texto, id: Date.now() });
    }, []);
    useEffect(() => {
        if (!aviso) return;
        const t = setTimeout(() => setAviso(null), 4200);
        return () => clearTimeout(t);
    }, [aviso]);

    const enviar = useCallback(async (id, pedido) => {
        try {
            const tarefa = await criarTarefa(pedido.tipo, pedido.params);
            atualizar(id, { tarefa, estado: 'gerando', iniciadoEm: Date.now() });
        } catch (e) {
            atualizar(id, { estado: 'falhou', motivo: e.message });
            avisar(e.message);
        }
    }, [atualizar, avisar]);

    // Cria um ou mais itens (quantidade = várias tarefas) e manda para o servidor.
    const gerar = useCallback(({ pedido, meta, quantidade = 1 }) => {
        const novos = Array.from({ length: quantidade }, () => ({
            id: novoId(),
            estado: 'enviando',
            criadoEm: Date.now(),
            pedido,
            ...meta,
        }));
        setItens((lista) => [...novos, ...lista]);
        novos.forEach((n) => enviar(n.id, pedido));
        return novos.map((n) => n.id);
    }, [enviar]);

    const tentarDeNovo = useCallback((id) => {
        const item = itensRef.current.find((i) => i.id === id);
        if (!item?.pedido) return;
        atualizar(id, { estado: 'enviando', motivo: null, tarefa: null, criadoEm: Date.now() });
        enviar(id, item.pedido);
    }, [atualizar, enviar]);

    const remover = useCallback((id) => setItens((lista) => lista.filter((i) => i.id !== id)), []);
    const alternarFavorito = useCallback((id) => setItens((lista) => lista.map((i) => (i.id === id ? { ...i, favorito: !i.favorito } : i))), []);

    // Acompanhamento: confere as tarefas em andamento, poucas por vez (o Kie.ai aceita 20 consultas a cada 10 s).
    useEffect(() => {
        if (!pronto) return;
        let vivo = true;
        let rodando = false;
        const ciclo = async () => {
            if (rodando) return;
            rodando = true;
            const pendentes = itensRef.current.filter((i) => i.estado === 'gerando' && i.tarefa).slice(0, 6);
            for (const item of pendentes) {
                if (!vivo) break;
                try {
                    const r = await consultarTarefa(item.tarefa);
                    if (r.estado === 'pronto') {
                        atualizar(item.id, { estado: 'pronto', url: r.urls[0], urls: r.urls, prontoEm: Date.now() });
                        avisar(item.avisoPronto || 'Geração pronta');
                    } else if (r.estado === 'falhou') {
                        atualizar(item.id, { estado: 'falhou', motivo: r.motivo });
                    } else if (typeof r.progresso === 'number') {
                        atualizar(item.id, { progresso: r.progresso });
                    }
                } catch (e) {
                    // Oscilação de rede: tenta de novo no próximo ciclo. Erro definitivo: marca como falha.
                    if (e.status === 400 || e.status === 404) atualizar(item.id, { estado: 'falhou', motivo: e.message });
                }
            }
            // Tarefa esquecida há mais de 40 min: desiste
            const limite = Date.now() - 40 * 60 * 1000;
            itensRef.current
                .filter((i) => (i.estado === 'gerando' || i.estado === 'enviando') && (i.iniciadoEm || i.criadoEm) < limite)
                .forEach((i) => atualizar(i.id, { estado: 'falhou', motivo: 'Demorou demais. Confira no painel do Kie.ai.' }));
            rodando = false;
        };
        const t = setInterval(ciclo, 3500);
        ciclo();
        return () => { vivo = false; clearInterval(t); };
    }, [pronto, atualizar, avisar]);

    const valor = useMemo(() => ({ itens, pronto, gerar, tentarDeNovo, remover, alternarFavorito, aviso, avisar }), [itens, pronto, gerar, tentarDeNovo, remover, alternarFavorito, aviso, avisar]);
    return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useHistorico() {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useHistorico precisa do ProvedorHistorico');
    return ctx;
}

// Os arquivos gerados ficam cerca de 14 dias no Kie.ai
export const DIAS_NO_KIE = 14;
export function expiraEmBreve(item) {
    if (!item?.prontoEm) return false;
    return Date.now() - item.prontoEm > (DIAS_NO_KIE - 4) * 24 * 3600 * 1000;
}
export function dataExpiracao(item) {
    if (!item?.prontoEm) return null;
    return new Date(item.prontoEm + DIAS_NO_KIE * 24 * 3600 * 1000);
}
