'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Criador from '@/components/Criador';
import Feed from '@/components/Feed';
import { Campo, Proporcoes, Referencias, Segmentado, SeletorModelo, useEnvios } from '@/components/Controles';
import { MODELOS_IMAGEM, rotuloProporcao } from '@/lib/modelos';
import { useHistorico } from '@/lib/historico';

export default function TelaImagem() {
    const busca = useSearchParams();
    const { itens, gerar, avisar } = useHistorico();
    const [modo, setModo] = useState('criar');
    const [modeloId, setModeloId] = useState(MODELOS_IMAGEM[0].id);
    const modelo = MODELOS_IMAGEM.find((m) => m.id === modeloId);
    const [prompt, setPrompt] = useState('');
    const [proporcao, setProporcao] = useState(modelo.proporcaoPadrao);
    const [qualidade, setQualidade] = useState(modelo.qualidade.padrao);
    const [quantidade, setQuantidade] = useState(1);
    const refs = useEnvios(modelo.maxRefs);

    // Vindo de outra tela: ?prompt=... ou ?ref=<imagem>
    useEffect(() => {
        const p = busca.get('prompt');
        const r = busca.get('ref');
        if (p) setPrompt(p);
        if (r) { setModo('editar'); refs.definirUrl(r); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busca]);

    const trocarModelo = (id) => {
        const m = MODELOS_IMAGEM.find((x) => x.id === id);
        setModeloId(id);
        if (!m.proporcoes.includes(proporcao)) setProporcao(m.proporcaoPadrao);
        if (!m.qualidade.opcoes.some(([v]) => v === qualidade)) setQualidade(m.qualidade.padrao);
    };

    const rotuloQualidade = modelo.qualidade.opcoes.find(([v]) => v === qualidade)?.[1] || qualidade;
    const editar = modo === 'editar';

    let motivo = null;
    if (!prompt.trim()) motivo = editar ? 'Descreva o que mudar nas referências.' : 'Escreva um prompt para gerar.';
    else if (editar && refs.enviando) motivo = 'Esperando o envio das imagens terminar.';
    else if (editar && !refs.urls.length) motivo = 'Envie pelo menos uma imagem de referência.';

    const aoGerar = () => {
        if (motivo) { avisar(motivo); return; }
        const params = { model: editar ? modelo.editar : modelo.criar, prompt: prompt.trim(), aspect_ratio: proporcao, [modelo.qualidade.campo]: qualidade };
        if (editar) params.images_list = refs.urls;
        gerar({
            quantidade,
            pedido: { tipo: editar ? 'edicao' : 'imagem', params },
            meta: {
                tipo: 'imagem', midia: 'imagem', titulo: 'Imagem', avisoPronto: 'Imagem pronta', prompt: prompt.trim(), modelo: modelo.nome, proporcao,
                detalhes: `${modelo.nome} · ${rotuloProporcao(proporcao)} · ${rotuloQualidade}${editar ? ` · ${refs.urls.length} ref.` : ''}`,
            },
        });
    };

    const meus = useMemo(() => itens.filter((i) => i.tipo === 'imagem'), [itens]);

    return (
        <Criador
            rotulo="Criar imagem"
            topo={
                <>
                    <Segmentado rotulo="Modo" valor={modo} aoMudar={setModo} opcoes={[['criar', 'Criar'], ['editar', 'Editar com referências']]} />
                    <Campo rotulo="Modelo"><SeletorModelo modelos={MODELOS_IMAGEM} valor={modeloId} aoMudar={trocarModelo} /></Campo>
                    {editar && <Referencias envios={refs} maximo={modelo.maxRefs} avisar={avisar} />}
                </>
            }
            prompt={{ valor: prompt, aoMudar: setPrompt, placeholder: editar ? 'O que mudar? Ex.: coloque o produto sobre mármore branco' : 'Descreva a imagem que você quer criar', max: 5000 }}
            opcoes={
                <>
                    <Campo rotulo="Proporção"><Proporcoes opcoes={modelo.proporcoes} valor={proporcao} aoMudar={setProporcao} /></Campo>
                    <div className="grid grid-cols-2 gap-3">
                        <Campo rotulo="Qualidade"><Segmentado rotulo="Qualidade" opcoes={modelo.qualidade.opcoes} valor={qualidade} aoMudar={setQualidade} /></Campo>
                        <Campo rotulo="Quantidade"><Segmentado rotulo="Quantidade" opcoes={[[1, '1'], [2, '2'], [3, '3'], [4, '4']]} valor={quantidade} aoMudar={setQuantidade} /></Campo>
                    </div>
                </>
            }
            resumo={`${modelo.nome} · ${rotuloProporcao(proporcao)} · ${rotuloQualidade}${quantidade > 1 ? ` · ${quantidade}x` : ''}`}
            gerar={{ rotulo: quantidade > 1 ? `Gerar ${quantidade} imagens` : 'Gerar imagem', aoGerar, desativado: !!motivo, motivo }}
            feed={<Feed itens={meus} vazio="Suas imagens aparecem aqui. Escreva um prompt e toque em Gerar." />}
        />
    );
}
