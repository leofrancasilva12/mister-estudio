'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Criador from '@/components/Criador';
import Feed from '@/components/Feed';
import { Campo, Pilulas, Proporcoes, Segmentado } from '@/components/Controles';
import { CINEMA, promptCinema, razaoCss } from '@/lib/modelos';
import { useHistorico } from '@/lib/historico';

function Visor({ camera, lente, focal, abertura, proporcao, qualidade }) {
    return (
        <section aria-label="Visor" className="relative overflow-hidden rounded-2xl bg-[#1a1a1a] font-mono text-white" style={{ aspectRatio: proporcao === '9:16' || proporcao === '4:5' || proporcao === '1:1' ? '21 / 9' : razaoCss(proporcao) }}>
            <div aria-hidden="true" className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                {Array.from({ length: 9 }, (_, i) => <span key={i} className={`${i % 3 < 2 ? 'border-r' : ''} ${i < 6 ? 'border-b' : ''} border-white/10`} />)}
            </div>
            <span aria-hidden="true" className="absolute left-1/2 top-1/2 -ml-[11px] -mt-[11px] h-[22px] w-[22px] rounded-full border border-white/60" />
            <div className="absolute inset-3.5 flex flex-col justify-between text-[11px]">
                <div className="flex justify-between gap-3"><span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-[7px] w-[7px] animate-pulsar rounded-full bg-white" />PRÉVIA</span><span>{proporcao} · {qualidade}</span></div>
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-white/85"><span>{camera.toUpperCase()}</span><span>{lente.toUpperCase()}</span><span>{focal}MM</span><span>{abertura.toUpperCase()}</span></div>
            </div>
        </section>
    );
}

export default function TelaCinema() {
    const busca = useSearchParams();
    const { itens, gerar, avisar } = useHistorico();
    const [prompt, setPrompt] = useState('');
    const [camera, setCamera] = useState(CINEMA.cameras[2][0]);
    const [lente, setLente] = useState(CINEMA.lentes[0][0]);
    const [focal, setFocal] = useState('35');
    const [abertura, setAbertura] = useState('f/1.4');
    const [proporcao, setProporcao] = useState('21:9');
    const [qualidade, setQualidade] = useState('2K');

    useEffect(() => { const p = busca.get('prompt'); if (p) setPrompt(p); }, [busca]);

    const efeito = `${focal} mm: ${CINEMA.focais.find((f) => f[0] === focal)[2]}. ${abertura}: ${CINEMA.aberturas.find((a) => a[0] === abertura)[2]}.`;
    const motivo = prompt.trim() ? null : 'Descreva a cena.';

    const aoGerar = () => {
        if (motivo) { avisar(motivo); return; }
        const final = promptCinema(prompt.trim(), camera, lente, focal, abertura);
        gerar({
            pedido: { tipo: 'imagem', params: { model: 'nano-banana-2', prompt: final, aspect_ratio: proporcao, resolution: qualidade } },
            meta: {
                tipo: 'cinema', midia: 'imagem', titulo: 'Cena', avisoPronto: 'Cena pronta', prompt: prompt.trim(), modelo: 'Nano Banana 2', proporcao,
                detalhes: `${camera} · ${lente} · ${focal}mm · ${abertura}`,
            },
        });
    };

    const meus = useMemo(() => itens.filter((i) => i.tipo === 'cinema'), [itens]);

    return (
        <Criador
            rotulo="Montar a cena"
            topo={null}
            prompt={{ valor: prompt, aoMudar: setPrompt, rotulo: 'Cena', placeholder: 'Ex.: mulher de perfil na janela ao entardecer, poeira no ar', max: 4000, linhas: 3 }}
            opcoes={
                <>
                    <Campo rotulo="Câmera">
                        <div className="grid grid-cols-2 gap-1.5">
                            {CINEMA.cameras.map(([n]) => (
                                <button key={n} type="button" aria-pressed={n === camera} onClick={() => setCamera(n)} className={`min-h-11 rounded-xl border px-2.5 py-1.5 text-left text-[13px] transition-colors ${n === camera ? 'border-tinta bg-tinta text-white' : 'border-linha text-[#3d3d3d] hover:border-tinta/40'}`}>{n}</button>
                            ))}
                        </div>
                    </Campo>
                    <Campo rotulo="Lente"><Pilulas rotulo="Lente" valor={lente} aoMudar={setLente} opcoes={CINEMA.lentes.map(([n]) => [n, n])} /></Campo>
                    <Campo rotulo="Distância focal (mm)"><Segmentado rotulo="Distância focal" valor={focal} aoMudar={setFocal} opcoes={CINEMA.focais.map(([n]) => [n, n])} /></Campo>
                    <Campo rotulo="Abertura"><Segmentado rotulo="Abertura" valor={abertura} aoMudar={setAbertura} opcoes={CINEMA.aberturas.map(([n]) => [n, n])} /></Campo>
                    <Campo rotulo="Proporção"><Proporcoes opcoes={CINEMA.proporcoes} valor={proporcao} aoMudar={setProporcao} /></Campo>
                    <Campo rotulo="Qualidade"><Segmentado rotulo="Qualidade" valor={qualidade} aoMudar={setQualidade} opcoes={[['1K', '1K'], ['2K', '2K'], ['4K', '4K']]} /></Campo>
                </>
            }
            resumo={`${camera} · ${focal}mm · ${abertura}`}
            gerar={{ rotulo: 'Rodar a cena', aoGerar, desativado: !!motivo, motivo }}
            feed={
                <div className="flex flex-col gap-5">
                    <Visor camera={camera} lente={lente} focal={focal} abertura={abertura} proporcao={proporcao} qualidade={qualidade} />
                    <p className="max-w-2xl text-sm leading-relaxed text-cinza">{efeito} O Estúdio transforma essas escolhas em instruções para o modelo de imagem.</p>
                    <Feed itens={meus} vazio="Suas tomadas aparecem aqui." />
                </div>
            }
        />
    );
}
