'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Criador from '@/components/Criador';
import Feed from '@/components/Feed';
import { Campo, Segmentado, SlotArquivo, useEnvios } from '@/components/Controles';
import { MODELOS_LIPSYNC } from '@/lib/modelos';
import { useHistorico } from '@/lib/historico';

const AUDIOS = 'audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/aac,audio/mp4,audio/x-m4a,audio/ogg';

export default function TelaLipSync() {
    const busca = useSearchParams();
    const { itensDaConversa, gerar, avisar } = useHistorico();
    const [fonte, setFonte] = useState('foto');
    const opcoes = MODELOS_LIPSYNC.filter((m) => m.fonte === fonte);
    const [modeloId, setModeloId] = useState(MODELOS_LIPSYNC[0].id);
    const modelo = opcoes.find((m) => m.id === modeloId) || opcoes[0];
    const [prompt, setPrompt] = useState('');
    const [resolucao, setResolucao] = useState('480p');
    const retrato = useEnvios(1, { avisar });
    const video = useEnvios(1, { avisar, aceita: 'video/mp4,video/quicktime' });
    const audio = useEnvios(1, { avisar, aceita: AUDIOS });

    useEffect(() => {
        const img = busca.get('imagem');
        const som = busca.get('audio');
        const p = busca.get('prompt');
        if (img) { setFonte('foto'); retrato.definirUrl(img); }
        if (som) audio.definirUrl(som, 'Voz do Estúdio', 'audio/mpeg');
        if (p) setPrompt(p);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busca]);

    useEffect(() => { if (modelo.id !== modeloId) setModeloId(modelo.id); }, [modelo.id, modeloId]);

    const base = fonte === 'foto' ? retrato : video;
    const anexar = () => (!base.itens.length ? base.escolher() : audio.escolher());
    const soltar = useCallback((arquivos) => {
        for (const f of arquivos) {
            const tipo = (f.type || '').split('/')[0];
            if (tipo === 'audio') audio.soltar([f]);
            else if (tipo === 'video') { setFonte('video'); video.soltar([f]); }
            else if (tipo === 'image') { setFonte('foto'); retrato.soltar([f]); }
        }
    }, [audio, video, retrato]);

    let motivo = null;
    if (base.enviando || audio.enviando) motivo = 'Esperando os envios terminarem.';
    else if (!base.urls.length) motivo = fonte === 'foto' ? 'Anexe a foto do rosto.' : 'Anexe o vídeo.';
    else if (!audio.urls.length) motivo = 'Anexe o áudio da fala.';

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

    const meus = itensDaConversa;

    return (
        <Criador
            rotulo="Criar lip sync"
            aoAnexar={anexar}
            rotuloAnexar={!base.itens.length ? (fonte === 'foto' ? 'Anexar foto' : 'Anexar vídeo') : 'Anexar áudio'}
            aoSoltar={soltar}
            anexos={[{ envios: base, rotulo: fonte === 'foto' ? 'Foto' : 'Vídeo' }, { envios: audio, rotulo: 'Áudio' }]}
            topo={
                <>
                    <Segmentado rotulo="Fonte" valor={fonte} aoMudar={setFonte} opcoes={[['foto', 'Foto que fala'], ['video', 'Trocar fala de vídeo']]} />
                    {fonte === 'foto'
                        ? <SlotArquivo envios={retrato} rotulo="Retrato" vazio="Anexar foto do rosto" proporcao="16 / 9" />
                        : <SlotArquivo envios={video} rotulo="Vídeo (uma pessoa de frente)" vazio="Anexar vídeo (até 50 MB)" proporcao="16 / 9" />}
                    <SlotArquivo envios={audio} rotulo="Áudio da fala" vazio="Anexar áudio (MP3 ou WAV, até 10 MB)" proporcao="5 / 1" />
                    <a href="/audio" className="-mt-2 text-xs text-cinza underline underline-offset-2">Não tem áudio? Crie uma voz na aba Áudio</a>
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
            resumo={[modelo.nome, base.urls.length ? (fonte === 'foto' ? 'foto ok' : 'vídeo ok') : null, audio.urls.length ? 'áudio ok' : null].filter(Boolean).join(' · ')}
            gerar={{ rotulo: 'Gerar vídeo falado', aoGerar, desativado: !!motivo, motivo }}
            feed={<Feed itens={meus} vazio="Toque em + para anexar uma foto e depois um áudio: o retrato ganha voz e expressão. O vídeo dura o mesmo tempo do áudio." />}
        />
    );
}
