'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Criador from '@/components/Criador';
import Feed from '@/components/Feed';
import Icone from '@/components/Icone';
import { Campo, Segmentado } from '@/components/Controles';
import { VOZES } from '@/lib/modelos';
import { useHistorico } from '@/lib/historico';
import { estimarCusto } from '@/lib/custos';

function Deslizante({ id, rotulo, valor, aoMudar, min, max, passo, mostrar }) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex justify-between"><label htmlFor={id} className="text-xs text-cinza">{rotulo}</label><span className="font-mono text-[11px] text-cinza">{mostrar(valor)}</span></div>
            <input id={id} type="range" min={min} max={max} step={passo} value={valor} onChange={(e) => aoMudar(Number(e.target.value))} className="h-6 w-full" />
        </div>
    );
}

function EscolhaVoz({ nome, valor, aoMudar }) {
    return (
        <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-xs text-cinza">Voz</legend>
            <div className="grid grid-cols-2 gap-1.5">
                {VOZES.map(([id, n, tipo]) => (
                    <label key={id} className={`flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-1.5 transition-colors ${id === valor ? 'border-tinta bg-pedra' : 'border-linha'}`}>
                        <input type="radio" name={nome} checked={id === valor} onChange={() => aoMudar(id)} className="h-4 w-4 accent-[#111111]" />
                        <span className="flex flex-col"><span className="text-sm">{n}</span><span className="text-[11px] text-cinza">{tipo}</span></span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}

const nomeDe = (id) => VOZES.find(([v]) => v === id)?.[1];

export default function TelaAudio() {
    const busca = useSearchParams();
    const { itensDaConversa, gerar, avisar } = useHistorico();
    const [modo, setModo] = useState('narracao');
    const [texto, setTexto] = useState('');
    const [voz, setVoz] = useState(VOZES[0][0]);
    const [velocidade, setVelocidade] = useState(1);
    const [estabilidade, setEstabilidade] = useState(0.5);
    const [estilo, setEstilo] = useState(0.2);
    // Diálogo: duas pessoas e falas alternadas
    const [vozA, setVozA] = useState(VOZES[0][0]);
    const [vozB, setVozB] = useState(VOZES[6][0]);
    const [falas, setFalas] = useState([{ quem: 'A', texto: '' }, { quem: 'B', texto: '' }]);

    useEffect(() => { const t = busca.get('texto'); if (t) setTexto(t); }, [busca]);

    const dialogo = modo === 'dialogo';
    const falasValidas = falas.filter((f) => f.texto.trim());
    const letras = dialogo ? falasValidas.reduce((n, f) => n + f.texto.trim().length, 0) : texto.trim().length;
    const motivo = dialogo
        ? (falasValidas.length < 1 ? 'Escreva pelo menos uma fala.' : letras > 5000 ? 'O diálogo passou de 5000 caracteres.' : null)
        : (texto.trim() ? null : 'Escreva o texto da fala.');
    const custo = dialogo ? estimarCusto('dialogo-v3', {}) : estimarCusto('voz-multilingual', { letras });

    const aoGerar = () => {
        if (motivo) { avisar(motivo); return; }
        if (dialogo) {
            const resumo = falasValidas.map((f) => `${nomeDe(f.quem === 'A' ? vozA : vozB)}: ${f.texto.trim()}`).join(' / ');
            gerar({
                pedido: { tipo: 'audio', params: { model: 'dialogo-v3', dialogue: falasValidas.map((f) => ({ text: f.texto.trim(), voice: f.quem === 'A' ? vozA : vozB })), stability: 0.5 } },
                meta: { tipo: 'audio', midia: 'audio', titulo: 'Diálogo', avisoPronto: 'Diálogo pronto', prompt: resumo, modelo: 'ElevenLabs Diálogo v3', chaveCusto: custo.chave, detalhes: `Diálogo · ${nomeDe(vozA)} e ${nomeDe(vozB)}` },
            });
            return;
        }
        gerar({
            pedido: { tipo: 'audio', params: { model: 'voz-multilingual', text: texto.trim(), voice: voz, speed: velocidade, stability: estabilidade, style: estilo } },
            meta: { tipo: 'audio', midia: 'audio', titulo: 'Voz', avisoPronto: 'Voz pronta', prompt: texto.trim(), modelo: 'ElevenLabs Multilingual v2', chaveCusto: custo.chave, detalhes: `${nomeDe(voz)} · ${velocidade.toFixed(2).replace('.', ',')}x` },
        });
    };

    const mudarFala = (i, mud) => setFalas((l) => l.map((f, k) => (k === i ? { ...f, ...mud } : f)));
    const editorDialogo = (
        <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
                {[['A', vozA, setVozA], ['B', vozB, setVozB]].map(([q, v, set]) => (
                    <div key={q} className="flex flex-col gap-1.5">
                        <label htmlFor={`voz-${q}`} className="text-xs text-cinza">Pessoa {q}</label>
                        <select id={`voz-${q}`} value={v} onChange={(e) => set(e.target.value)} className="h-11 rounded-xl border border-linha bg-white px-2.5 text-sm">
                            {VOZES.map(([id, n, t]) => <option key={id} value={id}>{n} ({t.toLowerCase()})</option>)}
                        </select>
                    </div>
                ))}
            </div>
            <span className="text-xs text-cinza">Falas</span>
            {falas.map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                    <button type="button" onClick={() => mudarFala(i, { quem: f.quem === 'A' ? 'B' : 'A' })} aria-label={`Fala ${i + 1}: pessoa ${f.quem}. Tocar para trocar`} className={`mt-1 flex h-9 w-9 flex-none items-center justify-center rounded-full text-xs font-medium ${f.quem === 'A' ? 'bg-tinta text-white' : 'border border-tinta'}`}>{f.quem}</button>
                    <label htmlFor={`fala-${i}`} className="sr-only">Fala {i + 1}</label>
                    <textarea id={`fala-${i}`} rows={2} value={f.texto} onChange={(e) => mudarFala(i, { texto: e.target.value })} placeholder={`O que ${nomeDe(f.quem === 'A' ? vozA : vozB)} diz`} className="min-w-0 flex-1 resize-y rounded-xl border border-linha p-2.5 text-sm outline-none focus:border-tinta" />
                    {falas.length > 1 && <button type="button" aria-label={`Remover fala ${i + 1}`} onClick={() => setFalas((l) => l.filter((_, k) => k !== i))} className="mt-1 flex h-9 w-9 flex-none items-center justify-center rounded-full text-cinza hover:text-tinta"><Icone nome="x" tamanho={14} /></button>}
                </div>
            ))}
            <button type="button" onClick={() => setFalas((l) => [...l, { quem: l[l.length - 1]?.quem === 'A' ? 'B' : 'A', texto: '' }])} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-dashed border-black/30 text-[13px]"><Icone nome="mais" tamanho={15} />Adicionar fala</button>
            <span className="font-mono text-[11px] text-suave">{letras} / 5000 caracteres</span>
        </div>
    );

    return (
        <Criador
            rotulo="Criar voz"
            topo={
                <>
                    <Segmentado rotulo="Tipo" valor={modo} aoMudar={setModo} opcoes={[['narracao', 'Narração'], ['dialogo', 'Diálogo']]} />
                    {dialogo ? editorDialogo : <EscolhaVoz nome="voz" valor={voz} aoMudar={setVoz} />}
                </>
            }
            prompt={dialogo ? null : { valor: texto, aoMudar: setTexto, rotulo: 'Texto da fala', placeholder: 'Escreva exatamente o que a voz vai dizer, em português.', max: 5000, linhas: 5 }}
            opcoes={dialogo ? null : (
                <Campo rotulo="">
                    <div className="flex flex-col gap-3.5">
                        <Deslizante id="velocidade" rotulo="Velocidade" valor={velocidade} aoMudar={setVelocidade} min={0.7} max={1.2} passo={0.05} mostrar={(v) => `${v.toFixed(2).replace('.', ',')}x`} />
                        <Deslizante id="estabilidade" rotulo="Estabilidade (mais alto = mais constante)" valor={estabilidade} aoMudar={setEstabilidade} min={0} max={1} passo={0.05} mostrar={(v) => `${Math.round(v * 100)}%`} />
                        <Deslizante id="estilo" rotulo="Expressividade" valor={estilo} aoMudar={setEstilo} min={0} max={1} passo={0.05} mostrar={(v) => `${Math.round(v * 100)}%`} />
                    </div>
                </Campo>
            )}
            resumo={dialogo ? `Diálogo · ${nomeDe(vozA)} e ${nomeDe(vozB)} · ${falasValidas.length} falas` : `${nomeDe(voz)} · ${velocidade.toFixed(2).replace('.', ',')}x`}
            gerar={{ rotulo: dialogo ? 'Gerar diálogo' : 'Gerar voz', aoGerar, desativado: !!motivo, motivo, custo }}
            feed={<Feed itens={itensDaConversa} vazio="Suas vozes aparecem aqui. Depois é só tocar em Usar no Lip Sync para dar voz a um retrato." />}
        />
    );
}
