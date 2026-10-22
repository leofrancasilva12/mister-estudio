'use client';

// Grade de resultados (feed) + visualizador em tela cheia.
import { useEffect, useState } from 'react';
import Icone from './Icone';
import Visualizador from './Visualizador';
import { useHistorico, expiraEmBreve } from '@/lib/historico';
import { razaoCss } from '@/lib/modelos';

const razao = (item) => (item.midia === 'audio' ? '5 / 2' : item.proporcao && item.proporcao.includes(':') ? razaoCss(item.proporcao) : item.midia === 'video' ? '16 / 10' : '1 / 1');

// Tempo médio de cada tipo (segundos). O Kie.ai não informa o progresso real da maioria dos modelos,
// então a porcentagem é uma estimativa pelo tempo: sobe até 95% e só chega a 100% quando o arquivo fica pronto.
const TEMPO_MEDIO = { imagem: 35, cinema: 35, video: 180, lipsync: 150, audio: 15, ferramenta: 45 };

function useAgora(ativo) {
    const [agora, setAgora] = useState(() => Date.now());
    useEffect(() => {
        if (!ativo) return;
        const t = setInterval(() => setAgora(Date.now()), 500);
        return () => clearInterval(t);
    }, [ativo]);
    return agora;
}

export function porcentagem(item, agora) {
    if (typeof item.progresso === 'number' && item.progresso > 0) return Math.min(99, Math.round(item.progresso));
    if (item.estado === 'enviando') return 0;
    const medio = (item.tipo === 'ferramenta' && item.midia === 'video' ? 120 : item.tipo === 'app' ? (item.midia === 'video' ? 240 : 40) : TEMPO_MEDIO[item.tipo]) || 60;
    const passou = Math.max(0, (agora - (item.iniciadoEm || item.criadoEm)) / 1000);
    return Math.min(95, Math.round(95 * (1 - Math.exp((-1.7 * passou) / medio))));
}

function CartaoAndamento({ item }) {
    const agora = useAgora(true);
    const pct = porcentagem(item, agora);
    return (
        <div role="status" aria-label={`Gerando ${pct}%`} className="flex flex-col justify-end gap-2.5 rounded-2xl border border-linha bg-[#fafaf9] p-3.5" style={{ aspectRatio: razao(item) }}>
            <span className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-medium">{item.estado === 'enviando' ? 'Enviando...' : 'Gerando'}</span>
                <span className="font-mono text-[22px] leading-none tracking-tight tabular-nums">{pct}%</span>
            </span>
            <span className="line-clamp-2 text-xs text-cinza">{item.detalhes}</span>
            <span className="h-1 overflow-hidden rounded-full bg-black/[0.08]">
                <span className="block h-full rounded-full bg-tinta transition-[width] duration-500 ease-out" style={{ width: `${Math.max(2, pct)}%` }} />
            </span>
        </div>
    );
}

function CartaoFalha({ item }) {
    const { tentarDeNovo, remover } = useHistorico();
    return (
        <div className="flex min-h-[180px] flex-col justify-between gap-3 rounded-2xl border border-linha p-3.5" style={{ aspectRatio: razao(item) }}>
            <span className="flex items-start gap-2 text-[13px] text-alerta"><Icone nome="aviso" tamanho={16} className="mt-0.5 flex-none" /><span className="line-clamp-4">{item.motivo || 'A geração falhou.'}</span></span>
            <span className="line-clamp-2 text-xs text-cinza">{item.detalhes}</span>
            <span className="flex gap-1.5">
                <button type="button" onClick={() => tentarDeNovo(item.id)} className="h-10 flex-1 rounded-xl bg-tinta text-[13px] text-white">Tentar de novo</button>
                <button type="button" aria-label="Remover" onClick={() => remover(item.id)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-linha"><Icone nome="lixeira" tamanho={16} /></button>
            </span>
        </div>
    );
}

function CartaoAudio({ item, abrir }) {
    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-linha p-3.5">
            <span className="flex items-center gap-2 text-xs text-cinza"><Icone nome="onda" tamanho={16} />{item.detalhes}</span>
            <p className="line-clamp-3 text-[13px] leading-relaxed">{item.prompt}</p>
            <audio src={item.url} controls preload="none" className="h-9 w-full" />
            <span className="flex gap-1.5">
                <a href={`/lipsync?${new URLSearchParams({ audio: item.url })}`} className="flex h-10 flex-1 items-center justify-center rounded-xl bg-tinta text-[13px] text-white">Usar no Lip Sync</a>
                <button type="button" aria-label="Mais opções" onClick={abrir} className="flex h-10 w-10 items-center justify-center rounded-xl border border-linha"><Icone nome="pontos" tamanho={16} /></button>
            </span>
        </div>
    );
}

function CartaoPronto({ item, abrir }) {
    if (item.midia === 'audio') return <CartaoAudio item={item} abrir={abrir} />;
    return (
        <button type="button" onClick={abrir} aria-label={`Abrir: ${item.titulo || item.prompt || 'resultado'}`} className="group relative block w-full overflow-hidden rounded-2xl bg-pedra text-left">
            {item.midia === 'video' ? (
                <>
                    <video src={item.url} muted playsInline preload="metadata" className="block w-full bg-tinta object-cover" style={{ aspectRatio: razao(item) }} onMouseEnter={(e) => e.currentTarget.play().catch(() => {})} onMouseLeave={(e) => e.currentTarget.pause()} />
                    <span className="absolute bottom-2.5 left-2.5 flex h-9 w-9 items-center justify-center rounded-full border border-white/60 text-white"><Icone nome="play" tamanho={13} /></span>
                </>
            ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.prompt || ''} loading="lazy" className="block w-full object-cover transition-transform duration-300 group-hover:scale-[1.015]" style={{ aspectRatio: item.proporcao === 'auto' ? undefined : razao(item) }} />
            )}
            {expiraEmBreve(item) && <span title="Expira em breve no Kie.ai" className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white"><Icone nome="relogio" tamanho={14} /></span>}
            {item.favorito && <span aria-label="Favorito" className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white"><Icone nome="coracao" tamanho={14} /></span>}
        </button>
    );
}

export default function Feed({ itens, vazio }) {
    const [aberto, setAberto] = useState(null);
    const prontos = itens.filter((i) => i.estado === 'pronto');
    if (!itens.length) {
        return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-linha p-8 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pedra"><Icone nome="faisca" /></span>
                <p className="max-w-xs text-sm leading-relaxed text-cinza">{vazio}</p>
            </div>
        );
    }
    return (
        <>
            <div className="mosaico">
                {itens.map((i) => (
                    <div key={i.id} className="animate-subir">
                        {i.estado === 'pronto' ? <CartaoPronto item={i} abrir={() => setAberto(i.id)} />
                            : i.estado === 'falhou' ? <CartaoFalha item={i} />
                                : <CartaoAndamento item={i} />}
                    </div>
                ))}
            </div>
            {aberto && <Visualizador itens={prontos} id={aberto} aoMudar={setAberto} aoFechar={() => setAberto(null)} />}
        </>
    );
}
