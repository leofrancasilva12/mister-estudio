'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Criador from '@/components/Criador';
import Feed from '@/components/Feed';
import { Campo, Segmentado, SlotArquivo, useEnvios } from '@/components/Controles';
import { FERRAMENTAS } from '@/lib/modelos';
import { useHistorico } from '@/lib/historico';

export default function TelaFerramentas() {
    const busca = useSearchParams();
    const { itens, gerar, avisar } = useHistorico();
    const [ferramentaId, setFerramentaId] = useState(FERRAMENTAS[0].id);
    const ferramenta = FERRAMENTAS.find((f) => f.id === ferramentaId);
    const [fator, setFator] = useState('2');
    const imagem = useEnvios(1, { avisar });
    const video = useEnvios(1, { avisar, aceita: 'video/mp4,video/quicktime' });
    const arquivo = ferramenta.entrada === 'video' ? video : imagem;

    useEffect(() => {
        const f = busca.get('ferramenta');
        const img = busca.get('imagem');
        const vid = busca.get('video');
        if (f && FERRAMENTAS.some((x) => x.id === f)) setFerramentaId(f);
        if (img) imagem.definirUrl(img);
        if (vid) { video.definirUrl(vid, 'Da biblioteca', 'video/mp4'); if (!f) setFerramentaId('topaz-video'); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busca]);

    const soltar = useCallback((arquivos) => {
        const f = arquivos[0];
        if ((f?.type || '').startsWith('video/')) { setFerramentaId('topaz-video'); video.soltar([f]); }
        else { if (ferramenta.entrada === 'video') setFerramentaId('topaz-imagem'); imagem.soltar([f]); }
    }, [ferramenta.entrada, video, imagem]);

    let motivo = null;
    if (arquivo.enviando) motivo = 'Esperando o envio terminar.';
    else if (!arquivo.urls.length) motivo = ferramenta.entrada === 'video' ? 'Anexe o vídeo.' : 'Anexe a imagem.';

    const aoGerar = () => {
        if (motivo) { avisar(motivo); return; }
        const params = { model: ferramenta.id, fator };
        if (ferramenta.entrada === 'video') params.video_url = video.urls[0]; else params.image_url = imagem.urls[0];
        gerar({
            pedido: { tipo: 'ferramenta', params },
            meta: {
                tipo: 'ferramenta', midia: ferramenta.entrada === 'video' ? 'video' : 'imagem', titulo: ferramenta.nome, avisoPronto: `${ferramenta.nome}: pronto`,
                prompt: '', modelo: ferramenta.motor, proporcao: ferramenta.entrada === 'video' ? '16:9' : 'auto',
                detalhes: [ferramenta.nome, ferramenta.fatores ? `${fator}x` : null].filter(Boolean).join(' · '),
            },
        });
    };

    const meus = useMemo(() => itens.filter((i) => i.tipo === 'ferramenta'), [itens]);

    return (
        <Criador
            rotulo="Ferramentas"
            aoAnexar={arquivo.escolher}
            rotuloAnexar={ferramenta.entrada === 'video' ? 'Anexar vídeo' : 'Anexar imagem'}
            aoSoltar={soltar}
            anexos={[{ envios: arquivo }]}
            topo={
                <>
                    <div role="radiogroup" aria-label="Ferramenta" className="grid grid-cols-2 gap-2">
                        {FERRAMENTAS.map((f) => {
                            const ativo = f.id === ferramentaId;
                            return (
                                <button key={f.id} type="button" role="radio" aria-checked={ativo} onClick={() => setFerramentaId(f.id)} className={`flex min-h-[104px] flex-col gap-1 rounded-2xl border p-3 text-left transition-colors ${ativo ? 'border-tinta bg-tinta text-white' : 'border-linha'}`}>
                                    <span className="text-sm font-medium">{f.nome}</span>
                                    <span className={`text-xs leading-snug ${ativo ? 'text-white/75' : 'text-cinza'}`}>{f.texto}</span>
                                </button>
                            );
                        })}
                    </div>
                    <SlotArquivo envios={arquivo} rotulo={ferramenta.entrada === 'video' ? 'Vídeo' : 'Imagem'} vazio={`${ferramenta.entrada === 'video' ? 'Anexar vídeo' : 'Anexar imagem'} · ${ferramenta.limite}`} proporcao="16 / 9" />
                </>
            }
            prompt={null}
            opcoes={ferramenta.fatores ? <Campo rotulo="Aumento"><Segmentado rotulo="Aumento" valor={fator} aoMudar={setFator} opcoes={[['2', '2x'], ['4', '4x']]} /></Campo> : null}
            resumo={[ferramenta.nome, ferramenta.fatores ? `${fator}x` : null, arquivo.urls.length ? 'arquivo ok' : null].filter(Boolean).join(' · ')}
            gerar={{ rotulo: ferramenta.nome, aoGerar, desativado: !!motivo, motivo }}
            feed={<Feed itens={meus} vazio="Toque em + para anexar uma imagem ou vídeo. Também dá para mandar direto do visualizador, pelos botões Ampliar e Tirar fundo." />}
        />
    );
}
