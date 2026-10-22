'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Criador from '@/components/Criador';
import Feed from '@/components/Feed';
import { Campo, Interruptor, Pilulas, Proporcoes, Referencias, Segmentado, SeletorModelo, SlotArquivo, useEnvios } from '@/components/Controles';
import { CAMERAS_VIDEO, MODELOS_VIDEO, rotuloProporcao } from '@/lib/modelos';
import { useHistorico } from '@/lib/historico';
import { estimarCusto } from '@/lib/custos';

const MODOS = [['texto', 'Texto'], ['quadros', 'Imagem'], ['referencias', 'Referências']];
const ajustar = (lista, valor, padrao) => (lista.includes(valor) ? valor : (padrao ?? lista[0]));
const proporcoesDe = (m, modo) => (modo === 'quadros' ? (m.proporcoesQuadros ?? m.proporcoes) : m.proporcoes);

export default function TelaVideo() {
    const busca = useSearchParams();
    const { itensDaConversa, gerar, avisar } = useHistorico();
    const [modo, setModo] = useState('texto');
    const disponiveis = MODELOS_VIDEO.filter((m) => m.modos.includes(modo));
    const [modeloId, setModeloId] = useState(MODELOS_VIDEO[0].id);
    const modelo = disponiveis.find((m) => m.id === modeloId) || disponiveis[0];
    const proporcoes = proporcoesDe(modelo, modo);
    const [prompt, setPrompt] = useState('');
    const [camera, setCamera] = useState('livre');
    const [proporcao, setProporcao] = useState(proporcoes[0]);
    const [duracao, setDuracao] = useState(modelo.duracoes[0]);
    const [resolucao, setResolucao] = useState(modelo.resolucaoPadrao);
    const [audio, setAudio] = useState(!!modelo.audioPadrao);
    const [variante, setVariante] = useState('veo3_fast');
    const inicial = useEnvios(1, { avisar });
    const final = useEnvios(1, { avisar });
    const refs = useEnvios(Math.max(1, modelo.maxRefs), { avisar });

    useEffect(() => {
        const p = busca.get('prompt');
        const img = busca.get('imagem');
        const m = busca.get('modelo');
        if (m && MODELOS_VIDEO.some((x) => x.id === m)) trocarModelo(m);
        if (p) setPrompt(p);
        if (img) { setModo('quadros'); inicial.definirUrl(img); }
        if (busca.get('modo') === 'imagem') setModo('quadros');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busca]);

    // Mantém as opções válidas quando o modelo ou o modo mudam
    useEffect(() => {
        if (modelo.id !== modeloId) setModeloId(modelo.id);
        if (proporcoes.length) setProporcao((p) => ajustar(proporcoes, p));
        setDuracao((d) => ajustar(modelo.duracoes, d, modelo.duracaoPadrao));
        setResolucao((r) => ajustar(modelo.resolucoes.map(([v]) => v), r, modelo.resolucaoPadrao));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modelo.id, modo]);

    const trocarModelo = (id) => {
        const m = MODELOS_VIDEO.find((x) => x.id === id);
        setModeloId(id);
        setAudio(!!m.audioPadrao);
    };

    // Botão + e arquivos arrastados/colados
    const anexar = () => {
        if (modo === 'referencias') return refs.escolher();
        if (modo === 'texto') setModo('quadros');
        if (inicial.itens.length && modelo.quadroFinal && !final.itens.length) return final.escolher();
        return inicial.escolher();
    };
    const soltar = useCallback((arquivos) => {
        if (modo === 'referencias') return refs.soltar(arquivos);
        setModo('quadros');
        if (!inicial.itens.length) {
            inicial.soltar(arquivos.slice(0, 1));
            if (arquivos[1]) final.soltar(arquivos.slice(1, 2));
        } else final.soltar(arquivos.slice(0, 1));
    }, [modo, refs, inicial, final]);

    let motivo = null;
    if (modo === 'texto' && !prompt.trim()) motivo = 'Descreva o vídeo que quer criar.';
    else if ([inicial, final, refs].some((e) => e.enviando)) motivo = 'Esperando os envios terminarem.';
    else if (modo === 'quadros' && !inicial.urls.length) motivo = 'Anexe a imagem do quadro inicial.';
    else if (modo === 'referencias' && !refs.urls.length) motivo = 'Anexe pelo menos uma imagem de referência.';
    else if (modelo.id === 'v-veo-3-1' && !prompt.trim()) motivo = 'O Veo precisa de um prompt.';
    else if (modelo.id === 'v-veo-3-1' && modo === 'referencias' && variante === 'veo3') motivo = 'Referências no Veo só funcionam na versão Rápido ou Leve.';
    else if (modelo.id === 'v-hailuo-2-3' && resolucao === '1080P' && Number(duracao) === 10) motivo = 'O Hailuo não faz 10 s em 1080P. Escolha 6 s ou 768p.';

    const rotuloRes = modelo.resolucoes.find(([v]) => v === resolucao)?.[1];
    const veoRef = modelo.id === 'v-veo-3-1' && modo === 'referencias';
    const partes = [
        modelo.nome,
        proporcoes.length ? rotuloProporcao(proporcao) : null,
        `${veoRef ? 8 : duracao} s`,
        rotuloRes,
        modelo.audio ? (audio ? 'com áudio' : 'sem áudio') : modelo.comAudioSempre ? 'com áudio' : null,
        modo === 'quadros' && final.urls.length ? 'início e fim' : null,
    ].filter(Boolean);

    const custo = estimarCusto(modelo.id, { modo, res: resolucao, variante: modelo.variantes ? variante : undefined, dur: veoRef ? 8 : Number(duracao), audio: modelo.audio ? audio : false });

    const aoGerar = () => {
        if (motivo) { avisar(motivo); return; }
        const cameraTexto = CAMERAS_VIDEO.find(([n]) => n === camera)?.[1];
        const textoFinal = [prompt.trim(), cameraTexto].filter(Boolean).join(', ');
        const params = { model: modelo.id, modo, prompt: textoFinal, duration: duracao, resolution: resolucao, audio };
        if (proporcoes.length) params.aspect_ratio = proporcao;
        if (modelo.variantes) params.variante = variante;
        if (modo === 'quadros') { params.image_url = inicial.urls[0]; if (modelo.quadroFinal && final.urls[0]) params.last_image_url = final.urls[0]; }
        if (modo === 'referencias') params.refs = refs.urls.slice(0, modelo.maxRefs);
        gerar({
            pedido: { tipo: 'video', params },
            meta: {
                tipo: 'video', midia: 'video', titulo: 'Vídeo', avisoPronto: 'Vídeo pronto', prompt: textoFinal, promptOriginal: prompt.trim(), modelo: modelo.nome,
                proporcao: proporcoes.length && proporcao.includes(':') ? proporcao : '16:9',
                chaveCusto: custo.chave,
                detalhes: partes.join(' · '),
            },
        });
    };

    const meus = itensDaConversa;
    const anexos = modo === 'quadros' ? [{ envios: inicial, rotulo: 'Início' }, ...(modelo.quadroFinal ? [{ envios: final, rotulo: 'Fim' }] : [])] : modo === 'referencias' ? [{ envios: refs }] : [];

    return (
        <Criador
            rotulo="Criar vídeo"
            aoAnexar={anexar}
            rotuloAnexar="Anexar imagem"
            aoSoltar={soltar}
            anexos={anexos}
            topo={
                <>
                    <Segmentado rotulo="Começar a partir de" valor={modo} aoMudar={setModo} opcoes={MODOS} />
                    <Campo rotulo="Modelo"><SeletorModelo modelos={disponiveis} valor={modelo.id} aoMudar={trocarModelo} iconeEscuro /></Campo>
                    {modo === 'quadros' && (
                        <div className={`grid gap-3 ${modelo.quadroFinal ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            <SlotArquivo envios={inicial} rotulo="Quadro inicial" vazio="Imagem de início" />
                            {modelo.quadroFinal && <SlotArquivo envios={final} rotulo="Quadro final (opcional)" vazio="Imagem de fim" opcional />}
                        </div>
                    )}
                    {modo === 'referencias' && <Referencias envios={refs} rotulo={`Referências (até ${modelo.maxRefs})`} dica="Rosto, roupa, produto ou cenário. O modelo usa tudo na mesma cena." />}
                </>
            }
            prompt={{ valor: prompt, aoMudar: setPrompt, placeholder: modo === 'texto' ? 'Descreva o vídeo que você quer criar' : 'Como a cena se move? Ex.: ela sorri e acena para a câmera', max: 2500, linhas: 3 }}
            opcoes={
                <>
                    {modelo.variantes && <Campo rotulo="Versão do Veo"><Segmentado rotulo="Versão" valor={variante} aoMudar={setVariante} opcoes={modelo.variantes} /></Campo>}
                    <Campo rotulo="Movimento de câmera"><Pilulas rotulo="Movimento de câmera" valor={camera} aoMudar={setCamera} opcoes={[['livre', 'Livre'], ...CAMERAS_VIDEO.map(([n]) => [n, n])]} /></Campo>
                    {proporcoes.length > 0 && <Campo rotulo="Proporção"><Proporcoes opcoes={proporcoes} valor={proporcao} aoMudar={setProporcao} /></Campo>}
                    <Campo rotulo="Duração">{veoRef ? <span className="text-sm text-cinza">8 s (fixo no modo referências)</span> : <Segmentado rotulo="Duração" opcoes={modelo.duracoes.map((d) => [d, `${d} s`])} valor={duracao} aoMudar={setDuracao} />}</Campo>
                    <Campo rotulo="Resolução"><Segmentado rotulo="Resolução" opcoes={modelo.resolucoes} valor={resolucao} aoMudar={setResolucao} /></Campo>
                    {modelo.audio && <Interruptor ligado={audio} aoMudar={setAudio} titulo="Gerar com áudio" texto="Sons e falas criados junto com o vídeo (custa mais)" />}
                    {modelo.comAudioSempre && <span className="text-xs text-cinza">O Veo já cria o vídeo com som.</span>}
                </>
            }
            resumo={partes.join(' · ')}
            gerar={{ rotulo: 'Gerar vídeo', aoGerar, desativado: !!motivo, motivo, custo }}
            feed={<Feed itens={meus} vazio="Seus vídeos aparecem aqui. Toque em + para animar uma foto. Vídeos levam de 1 a 5 minutos." />}
        />
    );
}
