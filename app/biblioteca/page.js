'use client';

import { useMemo, useState } from 'react';
import Feed from '@/components/Feed';
import Icone from '@/components/Icone';
import { useHistorico, DIAS_NO_KIE } from '@/lib/historico';

const FILTROS = [
    ['tudo', 'Tudo'],
    ['imagem', 'Imagens'],
    ['video', 'Vídeos'],
    ['lipsync', 'Lip Sync'],
    ['cinema', 'Cinema'],
    ['ferramenta', 'Ferramentas'],
    ['app', 'Apps'],
    ['favoritos', 'Favoritos'],
];

export default function Biblioteca() {
    const { itens, pronto } = useHistorico();
    const [filtro, setFiltro] = useState('tudo');
    const [busca, setBusca] = useState('');

    const lista = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        return itens.filter((i) => {
            if (filtro === 'favoritos' && !i.favorito) return false;
            if (filtro !== 'tudo' && filtro !== 'favoritos' && i.tipo !== filtro) return false;
            if (termo && !`${i.prompt || ''} ${i.modelo || ''} ${i.detalhes || ''} ${i.titulo || ''}`.toLowerCase().includes(termo)) return false;
            return true;
        });
    }, [itens, filtro, busca]);

    return (
        <main className="mx-auto flex w-full max-w-[1360px] flex-col gap-5 px-4 pb-28 pt-7 md:px-8 lg:pb-14">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <h1 className="text-[28px] font-medium tracking-[-0.03em]">Biblioteca</h1>
                <label htmlFor="busca-biblioteca" className="sr-only">Buscar na biblioteca</label>
                <input id="busca-biblioteca" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por prompt ou modelo" className="h-11 w-full rounded-full border border-linha px-4 text-sm outline-none focus:border-tinta sm:w-[300px]" />
            </div>
            <div role="group" aria-label="Filtro" className="sem-barra -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
                {FILTROS.map(([v, n]) => (
                    <button key={v} type="button" aria-pressed={filtro === v} onClick={() => setFiltro(v)} className={`h-10 flex-none rounded-full border px-4 text-[13px] transition-colors ${filtro === v ? 'border-tinta bg-tinta text-white' : 'border-linha text-[#3d3d3d]'}`}>{n}</button>
                ))}
            </div>
            <p className="flex items-start gap-2 text-[13px] leading-relaxed text-cinza">
                <Icone nome="relogio" tamanho={16} className="mt-0.5 flex-none" />
                O Kie.ai guarda os arquivos por cerca de {DIAS_NO_KIE} dias. Itens com relógio somem em breve: baixe o que quiser manter. Esta biblioteca fica salva neste aparelho.
            </p>
            {pronto && <Feed itens={lista} vazio={busca || filtro !== 'tudo' ? 'Nada encontrado com esse filtro.' : 'Tudo o que você gerar no Estúdio aparece aqui.'} />}
        </main>
    );
}
