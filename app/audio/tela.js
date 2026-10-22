'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Criador from '@/components/Criador';
import Feed from '@/components/Feed';
import { Campo } from '@/components/Controles';
import { VOZES } from '@/lib/modelos';
import { useHistorico } from '@/lib/historico';

function Deslizante({ id, rotulo, valor, aoMudar, min, max, passo, mostrar }) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex justify-between"><label htmlFor={id} className="text-xs text-cinza">{rotulo}</label><span className="font-mono text-[11px] text-cinza">{mostrar(valor)}</span></div>
            <input id={id} type="range" min={min} max={max} step={passo} value={valor} onChange={(e) => aoMudar(Number(e.target.value))} className="h-6 w-full" />
        </div>
    );
}

export default function TelaAudio() {
    const busca = useSearchParams();
    const { itens, gerar, avisar } = useHistorico();
    const [texto, setTexto] = useState('');
    const [voz, setVoz] = useState(VOZES[0][0]);
    const [velocidade, setVelocidade] = useState(1);
    const [estabilidade, setEstabilidade] = useState(0.5);
    const [estilo, setEstilo] = useState(0.2);

    useEffect(() => { const t = busca.get('texto'); if (t) setTexto(t); }, [busca]);

    const nomeVoz = VOZES.find(([id]) => id === voz)?.[1];
    const motivo = texto.trim() ? null : 'Escreva o texto da fala.';

    const aoGerar = () => {
        if (motivo) { avisar(motivo); return; }
        gerar({
            pedido: { tipo: 'audio', params: { model: 'voz-multilingual', text: texto.trim(), voice: voz, speed: velocidade, stability: estabilidade, style: estilo } },
            meta: { tipo: 'audio', midia: 'audio', titulo: 'Voz', avisoPronto: 'Voz pronta', prompt: texto.trim(), modelo: 'ElevenLabs Multilingual v2', detalhes: `${nomeVoz} · ${velocidade.toFixed(2).replace('.', ',')}x` },
        });
    };

    const meus = useMemo(() => itens.filter((i) => i.tipo === 'audio'), [itens]);

    return (
        <Criador
            rotulo="Criar voz"
            topo={
                <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 text-xs text-cinza">Voz</legend>
                    <div className="grid grid-cols-2 gap-1.5">
                        {VOZES.map(([id, nome, tipo]) => (
                            <label key={id} className={`flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-1.5 transition-colors ${id === voz ? 'border-tinta bg-pedra' : 'border-linha'}`}>
                                <input type="radio" name="voz" checked={id === voz} onChange={() => setVoz(id)} className="h-4 w-4 accent-[#111111]" />
                                <span className="flex flex-col"><span className="text-sm">{nome}</span><span className="text-[11px] text-cinza">{tipo}</span></span>
                            </label>
                        ))}
                    </div>
                </fieldset>
            }
            prompt={{ valor: texto, aoMudar: setTexto, rotulo: 'Texto da fala', placeholder: 'Escreva exatamente o que a voz vai dizer, em português.', max: 5000, linhas: 5 }}
            opcoes={
                <Campo rotulo="">
                    <div className="flex flex-col gap-3.5">
                        <Deslizante id="velocidade" rotulo="Velocidade" valor={velocidade} aoMudar={setVelocidade} min={0.7} max={1.2} passo={0.05} mostrar={(v) => `${v.toFixed(2).replace('.', ',')}x`} />
                        <Deslizante id="estabilidade" rotulo="Estabilidade (mais alto = mais constante)" valor={estabilidade} aoMudar={setEstabilidade} min={0} max={1} passo={0.05} mostrar={(v) => `${Math.round(v * 100)}%`} />
                        <Deslizante id="estilo" rotulo="Expressividade" valor={estilo} aoMudar={setEstilo} min={0} max={1} passo={0.05} mostrar={(v) => `${Math.round(v * 100)}%`} />
                    </div>
                </Campo>
            }
            resumo={`${nomeVoz} · ${velocidade.toFixed(2).replace('.', ',')}x`}
            gerar={{ rotulo: 'Gerar voz', aoGerar, desativado: !!motivo, motivo }}
            feed={<Feed itens={meus} vazio="Suas vozes aparecem aqui. Depois é só tocar em Usar no Lip Sync para dar voz a um retrato." />}
        />
    );
}
