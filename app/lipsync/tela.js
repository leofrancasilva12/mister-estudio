'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Criador from '@/components/Criador';
import Feed from '@/components/Feed';
import { Campo, Segmentado, SlotArquivo, useEnvios } from '@/components/Controles';
import { MODELOS_LIPSYNC } from '@/lib/modelos';
import { useHistorico } from '@/lib/historico';

export default function TelaLipSync() {
    const busca = useSearchParams();
    const { itens, gerar, avisar } = useHistorico();
    const [fonte, setFonte] = useState('foto');
    const opcoes = MODELOS_LIPSYNC.filter((m) => m.fonte === fonte);
    const [modeloId, setModeloId] = useState(MODELOS_LIPSYNC[0].id);
    const modelo = opcoes.find((m) => m.id === modeloId) || opcoes[0];
    const [prompt, setPrompt] = useState('');
    const [resolucao, setResolucao] = useState('480p');
    const retrato = useEnvios(1);
    const video = useEnvios(1);
    const audio = useEnvios(1);

    useEffect(() => {
        const img = busca.get('imagem');
        const p = busca.get('prompt');
        if (img) { setFonte('foto'); retrato.definirUrl(img); }
        if (p) setPrompt(p);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busca]);

    useEffect(() => { if (modelo.id !== modeloId) setModeloId(modelo.id); }, [modelo.id, modeloId]);

    const base = fonte === 'foto' ? retrato : video;
    let motivo = null;
    if (base.enviando || audio.enviando) motivo = 'Esperando os envios terminarem.';
    else if (!base.urls.length) motivo = fonte === 'foto' ? 'Envie o retrato.' : 'Envie o vídeo.';
    else if (!audio.urls.length) motivo = 'Envie o áudio da fala.';

    const aoGerar = () => {
        if (motivo) { avisar(motivo); return; }
        const params = { model: modelo.id, audio_url: audio.urls[0] };
        if (fonte === 'foto') params.image_url = retrato.urls[0]; else params.video_url = video.urls[0];
        if (modelo.prompt && prompt.trim()) params.prompt = prompt.trim();
        if (modelo.resolucoes) params.resolution = resolucao;
        gerar({
            pedido: { tipo: 'lipsync', params },
            meta: {
                tipo: 'lipsync', midia: 'video', titulo: 'Lip Sync', avisoPronto: 'Vídeo falado pronto', prompt: prompt.trim(), modelo: modelo.nome,
                proporcao: fonte === 'foto' ? '3:4' : '16:9',
                detalhes: [modelo.nome, modelo.resolucoes ? resolucao : null].filter(Boolean).join(' · '),
            },
        });
    };

    const meus = useMemo(() => itens.filter((i) => i.tipo === 'lipsync'), [itens]);

    return (
        <Criador
            rotulo="Criar lip sync"
            topo={
                <>
                    <Segmentado rotulo="Fonte" valor={fonte} aoMudar={setFonte} opcoes={[['foto', 'Foto que fala'], ['video', 'Trocar fala de vídeo']]} />
                    {fonte === 'foto'
                        ? <SlotArquivo envios={retrato} aceita="image/jpeg,image/png,image/webp" rotulo="Retrato" vazio="Enviar foto do rosto" avisar={avisar} proporcao="16 / 9" />
                        : <SlotArquivo envios={video} aceita="video/mp4,video/quicktime" rotulo="Vídeo (uma pessoa de frente)" vazio="Enviar vídeo (até 50 MB)" avisar={avisar} proporcao="16 / 9" />}
                    <SlotArquivo envios={audio} aceita="audio/mpeg,audio/wav,audio/x-wav,audio/aac,audio/mp4,audio/ogg" rotulo="Áudio da fala" vazio="Enviar áudio (MP3, WAV, até 10 MB)" avisar={avisar} proporcao="5 / 1" />
                    <fieldset className="flex flex-col gap-2">
                        <legend className="mb-2 text-xs text-cinza">Modelo</legend>
                        {opcoes.map((m) => (
                            <label key={m.id} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 transition-colors ${m.id === modelo.id ? 'border-tinta' : 'border-linha'}`}>
                                <input type="radio" name="modelo-lipsync" checked={m.id === modelo.id} onChange={() => setModeloId(m.id)} className="h-[18px] w-[18px] accent-[#111111]" />
                                <span className="flex flex-col gap-0.5"><span className="text-sm font-medium">{m.nome}</span><span className="text-xs text-cinza">{m.detalhe}</span></span>
                            </label>
                        ))}
                    </fieldset>
                </>
            }
            prompt={modelo.prompt ? { valor: prompt, aoMudar: setPrompt, rotulo: 'Expressão e câmera (opcional)', placeholder: 'Ex.: fala de forma calorosa e sorri no final', max: 5000, linhas: 2 } : null}
            opcoes={modelo.resolucoes ? <Campo rotulo="Resolução"><Segmentado rotulo="Resolução" opcoes={modelo.resolucoes.map((r) => [r, r])} valor={resolucao} aoMudar={setResolucao} /></Campo> : null}
            resumo={[modelo.nome, base.urls.length ? (fonte === 'foto' ? 'retrato ok' : 'vídeo ok') : null, audio.urls.length ? 'áudio ok' : null].filter(Boolean).join(' · ')}
            gerar={{ rotulo: 'Gerar vídeo falado', aoGerar, desativado: !!motivo, motivo }}
            feed={<Feed itens={meus} vazio="Envie uma foto e um áudio: o retrato ganha voz e expressão. O vídeo dura o mesmo tempo do áudio." />}
        />
    );
}
