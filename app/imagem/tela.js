'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Criador from '@/components/Criador';
import Feed from '@/components/Feed';
import { Campo, Proporcoes, Referencias, Segmentado, SeletorModelo, useEnvios } from '@/components/Controles';
import { MODELOS_IMAGEM, rotuloProporcao } from '@/lib/modelos';
import { useHistorico } from '@/lib/historico';
import { estimarCusto } from '@/lib/custos';

const QUE_EDITA = MODELOS_IMAGEM.find((m) => m.editar);

export default function TelaImagem() {
    const busca = useSearchParams();
    const { itensDaConversa, gerar, avisar } = useHistorico();
    const [modo, setModo] = useState('criar');
    const [modeloId, setModeloId] = useState(MODELOS_IMAGEM[0].id);
    const modelo = MODELOS_IMAGEM.find((m) => m.id === modeloId);
    const [prompt, setPrompt] = useState('');
    const [proporcao, setProporcao] = useState(modelo.proporcaoPadrao);
    const [qualidade, setQualidade] = useState(modelo.qualidade.padrao);
    const [quantidade, setQuantidade] = useState(1);
    const refs = useEnvios(Math.max(1, modelo.maxRefs), { avisar });

    const trocarModelo = useCallback((id) => {
        const m = MODELOS_IMAGEM.find((x) => x.id === id);
        setModeloId(id);
        setProporcao((p) => (m.proporcoes.includes(p) ? p : m.proporcaoPadrao));
        setQualidade((q) => (m.qualidade.opcoes.some(([v]) => v === q) ? q : m.qualidade.padrao));
        if (!m.editar) setModo('criar');
    }, []);

    // Entrar no modo de edição; se o modelo atual não edita, troca para um que edita
    const irParaEdicao = useCallback(() => {
        if (!modelo.editar) { trocarModelo(QUE_EDITA.id); avisar(`Trocamos para ${QUE_EDITA.nome}, que edita imagens.`); }
        setModo('editar');
    }, [modelo.editar, trocarModelo, avisar]);

    useEffect(() => {
        const p = busca.get('prompt');
        const r = busca.get('ref');
        const m = busca.get('modelo');
        if (m && MODELOS_IMAGEM.some((x) => x.id === m)) trocarModelo(m);
        if (p) setPrompt(p);
        if (r) { irParaEdicao(); refs.definirUrl(r); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busca]);

    const anexar = () => { irParaEdicao(); refs.escolher(); };
    const soltar = useCallback((arquivos) => { irParaEdicao(); refs.soltar(arquivos); }, [irParaEdicao, refs]);

    const rotuloQualidade = modelo.qualidade.opcoes.find(([v]) => v === qualidade)?.[1] || qualidade;
    const editar = modo === 'editar';

    let motivo = null;
    if (!prompt.trim()) motivo = editar ? 'Descreva o que mudar nas imagens.' : 'Escreva um prompt para gerar.';
    else if (editar && refs.enviando) motivo = 'Esperando o envio das imagens terminar.';
    else if (editar && !refs.urls.length) motivo = 'Anexe pelo menos uma imagem.';
    else if (modelo.id === 'gpt-image-2' && qualidade === '2K' && ['4:5', '5:4'].includes(proporcao)) motivo = 'O GPT Image 2 não faz 4:5 ou 5:4 em 2K. Use 1K ou 4K.';

    const custo = estimarCusto(editar ? modelo.editar : modelo.criar, { modo: editar ? 'editar' : 'criar', res: qualidade }, quantidade);

    const aoGerar = () => {
        if (motivo) { avisar(motivo); return; }
        const params = { model: editar ? modelo.editar : modelo.criar, prompt: prompt.trim(), aspect_ratio: proporcao, [modelo.qualidade.campo]: qualidade };
        if (editar) params.images_list = refs.urls;
        gerar({
            quantidade,
            pedido: { tipo: editar ? 'edicao' : 'imagem', params },
            meta: {
                tipo: 'imagem', midia: 'imagem', titulo: 'Imagem', avisoPronto: 'Imagem pronta', prompt: prompt.trim(), modelo: modelo.nome, proporcao,
                chaveCusto: custo.chave,
                detalhes: `${modelo.nome} · ${rotuloProporcao(proporcao)} · ${rotuloQualidade}${editar ? ` · ${refs.urls.length} ref.` : ''}`,
            },
        });
    };

    const meus = itensDaConversa;
    const opcoesModo = modelo.editar ? [['criar', 'Criar'], ['editar', 'Editar com imagens']] : [['criar', 'Criar']];

    return (
        <Criador
            rotulo="Criar imagem"
            aoAnexar={anexar}
            rotuloAnexar="Anexar imagem para editar"
            aoSoltar={soltar}
            anexos={editar ? [{ envios: refs }] : []}
            topo={
                <>
                    <Segmentado rotulo="Modo" valor={modo} aoMudar={(m) => (m === 'editar' ? irParaEdicao() : setModo(m))} opcoes={opcoesModo} />
                    <Campo rotulo="Modelo"><SeletorModelo modelos={MODELOS_IMAGEM} valor={modeloId} aoMudar={trocarModelo} /></Campo>
                    {editar && <Referencias envios={refs} rotulo={`Imagens (até ${modelo.maxRefs})`} dica="Use a imagem que quer editar ou referências de rosto, produto e estilo." />}
                    {!modelo.editar && <span className="-mt-2 text-xs text-cinza">O {modelo.nome} só cria do zero. Para editar uma imagem, toque em + ou escolha outro modelo.</span>}
                </>
            }
            prompt={{ melhorar: 'imagem', valor: prompt, aoMudar: setPrompt, placeholder: editar ? 'O que mudar? Ex.: coloque o produto sobre mármore branco' : 'Descreva a imagem que você quer criar', max: 5000 }}
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
            gerar={{ rotulo: quantidade > 1 ? `Gerar ${quantidade} imagens` : 'Gerar imagem', aoGerar, desativado: !!motivo, motivo, custo }}
            feed={<Feed itens={meus} vazio="Suas imagens aparecem aqui. Escreva um prompt e toque em Gerar, ou toque em + para editar uma foto sua." />}
        />
    );
}
