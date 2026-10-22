'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Criador from '@/components/Criador';
import Feed from '@/components/Feed';
import { Campo, Interruptor, Pilulas, Proporcoes, Segmentado, SeletorModelo, SlotArquivo, useEnvios } from '@/components/Controles';
import { CAMERAS_VIDEO, MODELOS_VIDEO, rotuloProporcao } from '@/lib/modelos';
import { useHistorico } from '@/lib/historico';

const ajustar = (lista, valor, padrao) => (lista.includes(valor) ? valor : (padrao ?? lista[0]));

export default function TelaVideo() {
    const busca = useSearchParams();
    const { itens, gerar, avisar } = useHistorico();
    const [modo, setModo] = useState('texto');
    const disponiveis = MODELOS_VIDEO.filter((m) => (modo === 'texto' ? m.texto : m.imagem));
    const [modeloId, setModeloId] = useState(MODELOS_VIDEO[0].id);
    const modelo = disponiveis.find((m) => m.id === modeloId) || disponiveis[0];
    const proporcoes = modo === 'texto' ? modelo.proporcoes : modelo.proporcoesImagem;
    const [prompt, setPrompt] = useState('');
    const [camera, setCamera] = useState('livre');
    const [proporcao, setProporcao] = useState(proporcoes[0]);
    const [duracao, setDuracao] = useState(modelo.duracoes[0]);
    const [resolucao, setResolucao] = useState(modelo.resolucaoPadrao);
    const [audio, setAudio] = useState(!!modelo.audioPadrao);
    const quadro = useEnvios(1);

    useEffect(() => {
        const p = busca.get('prompt');
        const img = busca.get('imagem');
        if (p) setPrompt(p);
        if (img) { setModo('imagem'); quadro.definirUrl(img); }
        if (busca.get('modo') === 'imagem') setModo('imagem');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busca]);

    // Mantém as opções válidas quando o modelo ou o modo mudam
    useEffect(() => {
        if (modelo.id !== modeloId) setModeloId(modelo.id);
        if (proporcoes.length) setProporcao((p) => (modo === 'imagem' ? proporcoes[0] : ajustar(proporcoes, p)));
        setDuracao((d) => ajustar(modelo.duracoes, d));
        if (modelo.resolucoes.length) setResolucao((r) => ajustar(modelo.resolucoes, r, modelo.resolucaoPadrao));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modelo.id, modo]);

    const trocarModelo = (id) => {
        const m = MODELOS_VIDEO.find((x) => x.id === id);
        setModeloId(id);
        setAudio(!!m.audioPadrao);
    };

    const deImagem = modo === 'imagem';
    let motivo = null;
    if (!deImagem && !prompt.trim()) motivo = 'Descreva o vídeo que quer criar.';
    else if (deImagem && quadro.enviando) motivo = 'Esperando o envio da imagem terminar.';
    else if (deImagem && !quadro.urls.length) motivo = 'Envie a imagem do quadro inicial.';
    else if (modelo.id === 'hailuo-2.3' && resolucao === '1080P' && Number(duracao) === 10) motivo = 'O Hailuo não faz 10 s em 1080P. Escolha 6 s ou 768P.';

    const cameraTexto = CAMERAS_VIDEO.find(([n]) => n === camera)?.[1];
    const partes = [
        modelo.nome,
        proporcoes.length ? rotuloProporcao(proporcao) : null,
        `${duracao} s`,
        modelo.resolucoes.length ? resolucao : null,
        modelo.audio ? (audio ? 'com áudio' : 'sem áudio') : null,
    ].filter(Boolean);

    const aoGerar = () => {
        if (motivo) { avisar(motivo); return; }
        const textoFinal = [prompt.trim(), cameraTexto].filter(Boolean).join(', ');
        const params = { model: deImagem ? modelo.imagem : modelo.texto, prompt: textoFinal, duration: duracao };
        if (proporcoes.length) params.aspect_ratio = proporcao;
        if (modelo.resolucoes.length) params.resolution = resolucao;
        if (modelo.audio) params.mode = audio ? 'Com áudio' : 'Sem áudio';
        if (deImagem) params.image_url = quadro.urls[0];
        gerar({
            pedido: { tipo: deImagem ? 'imagem-video' : 'video', params },
            meta: {
                tipo: 'video', midia: 'video', titulo: 'Vídeo', avisoPronto: 'Vídeo pronto', prompt: textoFinal, promptOriginal: prompt.trim(), modelo: modelo.nome,
                proporcao: proporcoes.length && proporcao !== 'adaptive' ? proporcao : '16:9',
                detalhes: partes.join(' · '),
            },
        });
    };

    const meus = useMemo(() => itens.filter((i) => i.tipo === 'video'), [itens]);

    return (
        <Criador
            rotulo="Criar vídeo"
            topo={
                <>
                    <Segmentado rotulo="Modo" valor={modo} aoMudar={setModo} opcoes={[['texto', 'A partir de texto'], ['imagem', 'A partir de imagem']]} />
                    <Campo rotulo="Modelo"><SeletorModelo modelos={disponiveis} valor={modelo.id} aoMudar={trocarModelo} iconeEscuro /></Campo>
                    {deImagem && <SlotArquivo envios={quadro} aceita="image/jpeg,image/png,image/webp" rotulo="Quadro inicial" vazio="Enviar imagem" avisar={avisar} />}
                </>
            }
            prompt={{ valor: prompt, aoMudar: setPrompt, placeholder: deImagem ? 'Como a cena se move? (opcional)' : 'Descreva o vídeo que você quer criar', max: 2500, linhas: 3 }}
            opcoes={
                <>
                    <Campo rotulo="Movimento de câmera"><Pilulas rotulo="Movimento de câmera" valor={camera} aoMudar={setCamera} opcoes={[['livre', 'Livre'], ...CAMERAS_VIDEO.map(([n]) => [n, n])]} /></Campo>
                    {proporcoes.length > 0 && <Campo rotulo="Proporção"><Proporcoes opcoes={proporcoes} valor={proporcao} aoMudar={setProporcao} /></Campo>}
                    <div className="grid grid-cols-2 gap-3">
                        <Campo rotulo="Duração"><Segmentado rotulo="Duração" opcoes={modelo.duracoes.map((d) => [d, `${d} s`])} valor={duracao} aoMudar={setDuracao} /></Campo>
                        {modelo.resolucoes.length > 0 && <Campo rotulo="Resolução"><Segmentado rotulo="Resolução" opcoes={modelo.resolucoes.map((r) => [r, r])} valor={resolucao} aoMudar={setResolucao} /></Campo>}
                    </div>
                    {modelo.audio && <Interruptor ligado={audio} aoMudar={setAudio} titulo="Gerar com áudio" texto="Sons criados junto com o vídeo (custa mais)" />}
                </>
            }
            resumo={partes.join(' · ')}
            gerar={{ rotulo: 'Gerar vídeo', aoGerar, desativado: !!motivo, motivo }}
            feed={<Feed itens={meus} vazio="Seus vídeos aparecem aqui. Vídeos levam de 1 a 5 minutos para ficar prontos." />}
        />
    );
}
