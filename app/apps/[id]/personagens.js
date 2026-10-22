'use client';

import { useState } from 'react';
import Criador from '@/components/Criador';
import Feed from '@/components/Feed';
import Icone from '@/components/Icone';
import { Campo, Proporcoes, Segmentado } from '@/components/Controles';
import { appPorId } from '@/lib/apps';
import { useHistorico } from '@/lib/historico';
import { usePersonagens } from '@/lib/personagens';
import { estimarCusto } from '@/lib/custos';
import { CabecalhoApp } from './tela';

function NovoPersonagem({ aoCriar, aoCancelar }) {
    const { avisar } = useHistorico();
    const [nome, setNome] = useState('');
    const [arquivos, setArquivos] = useState([]);
    const [salvando, setSalvando] = useState(false);
    const escolher = () => {
        const e = document.createElement('input');
        e.type = 'file'; e.accept = 'image/jpeg,image/png,image/webp'; e.multiple = true;
        e.onchange = () => setArquivos((a) => [...a, ...Array.from(e.files)].slice(0, 4));
        e.click();
    };
    const salvar = async () => {
        if (!nome.trim()) { avisar('Dê um nome ao personagem.'); return; }
        if (arquivos.length < 1) { avisar('Anexe de 1 a 4 fotos do rosto.'); return; }
        setSalvando(true);
        try { await aoCriar(nome, arquivos); } catch (e) { avisar(e.message); setSalvando(false); }
    };
    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-tinta p-3">
            <label htmlFor="nome-personagem" className="text-xs text-cinza">Nome</label>
            <input id="nome-personagem" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={40} placeholder="Ex.: Porta-voz 3D" className="-mt-1.5 h-11 rounded-xl border border-linha px-3 text-sm outline-none focus:border-tinta" />
            <span className="text-xs text-cinza">Fotos do rosto (1 a 4, de ângulos diferentes)</span>
            <div className="flex flex-wrap gap-2">
                {arquivos.map((f, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={URL.createObjectURL(f)} alt="" className="h-14 w-14 rounded-xl object-cover" />
                ))}
                {arquivos.length < 4 && <button type="button" aria-label="Adicionar foto" onClick={escolher} className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-black/30"><Icone nome="mais" /></button>}
            </div>
            <div className="flex gap-2">
                <button type="button" onClick={salvar} disabled={salvando} className="h-11 flex-1 rounded-xl bg-tinta text-sm text-white disabled:opacity-50">{salvando ? 'Salvando...' : 'Salvar personagem'}</button>
                <button type="button" onClick={aoCancelar} className="h-11 px-3 text-sm">Cancelar</button>
            </div>
        </div>
    );
}

export default function TelaPersonagens() {
    const app = appPorId('personagens');
    const { itensDaConversa, gerar, avisar } = useHistorico();
    const { lista, criar, apagar, linksDe } = usePersonagens();
    const [escolhido, setEscolhido] = useState(null);
    const [novo, setNovo] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [proporcao, setProporcao] = useState('4:5');
    const [res, setRes] = useState('2K');
    const [quantidade, setQuantidade] = useState(1);
    const [preparando, setPreparando] = useState(false);
    const [confirmar, setConfirmar] = useState(null);
    const atual = lista.find((p) => p.id === escolhido) || null;

    const custo = estimarCusto('nano-banana-pro', { modo: 'editar', res }, quantidade);
    let motivo = null;
    if (!atual) motivo = lista.length ? 'Escolha um personagem.' : 'Crie seu primeiro personagem.';
    else if (!prompt.trim()) motivo = 'Descreva a cena do personagem.';
    else if (preparando) motivo = 'Enviando as fotos do personagem...';

    const aoGerar = async () => {
        if (motivo) { avisar(motivo); return; }
        setPreparando(true);
        try {
            const refs = await linksDe(atual.id);
            gerar({
                quantidade,
                pedido: { tipo: 'edicao', params: { model: 'nano-banana-pro', prompt: `Create a new image of the same person shown in the reference images. Keep the face, identity, skin tone and features identical. Scene: ${prompt.trim()}`, images_list: refs, aspect_ratio: proporcao, resolution: res } },
                meta: { tipo: 'app', appId: 'personagens', midia: 'imagem', titulo: atual.nome, avisoPronto: `${atual.nome}: pronto`, prompt: prompt.trim(), modelo: 'Nano Banana Pro', proporcao, chaveCusto: custo.chave, detalhes: `${atual.nome} · ${proporcao} · ${res}` },
            });
        } catch (e) {
            avisar(e.message);
        } finally {
            setPreparando(false);
        }
    };

    return (
        <Criador
            rotulo="Personagens"
            topo={
                <>
                    <CabecalhoApp app={app} />
                    <Campo rotulo="Seus personagens">
                        <div className="grid grid-cols-2 gap-2">
                            {lista.map((p) => {
                                const ativo = p.id === escolhido;
                                return (
                                    <div key={p.id} className={`relative rounded-2xl border p-1.5 ${ativo ? 'border-tinta' : 'border-linha'}`}>
                                        <button type="button" onClick={() => setEscolhido(p.id)} aria-pressed={ativo} className="flex w-full flex-col gap-1.5 text-left">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={p.fotos[0]} alt="" className="aspect-square w-full rounded-xl object-cover" />
                                            <span className="truncate px-1 text-[13px] font-medium">{p.nome}</span>
                                            <span className="px-1 pb-1 text-[11px] text-cinza">{p.fotos.length} {p.fotos.length === 1 ? 'foto' : 'fotos'}</span>
                                        </button>
                                        {ativo && (confirmar === p.id
                                            ? <button type="button" onClick={() => { apagar(p.id); setEscolhido(null); setConfirmar(null); }} className="absolute right-2 top-2 h-8 rounded-lg bg-alerta px-2 text-[11px] text-white">Apagar?</button>
                                            : <button type="button" aria-label={`Apagar ${p.nome}`} onClick={() => setConfirmar(p.id)} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90"><Icone nome="lixeira" tamanho={14} /></button>)}
                                    </div>
                                );
                            })}
                            {!novo && (
                                <button type="button" onClick={() => setNovo(true)} className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-black/30 text-[13px] text-cinza hover:border-tinta hover:text-tinta">
                                    <Icone nome="mais" />Novo personagem
                                </button>
                            )}
                        </div>
                    </Campo>
                    {novo && <NovoPersonagem aoCriar={async (n, a) => { const p = await criar(n, a); setEscolhido(p.id); setNovo(false); }} aoCancelar={() => setNovo(false)} />}
                </>
            }
            prompt={{ melhorar: 'imagem', valor: prompt, aoMudar: setPrompt, rotulo: 'Cena', placeholder: 'Ex.: segurando um frasco de sérum, fundo off-white, luz suave', max: 4000, linhas: 3 }}
            opcoes={
                <>
                    <Campo rotulo="Proporção"><Proporcoes opcoes={['1:1', '4:5', '3:4', '9:16', '16:9']} valor={proporcao} aoMudar={setProporcao} /></Campo>
                    <div className="grid grid-cols-2 gap-3">
                        <Campo rotulo="Qualidade"><Segmentado rotulo="Qualidade" opcoes={[['1K', '1K'], ['2K', '2K'], ['4K', '4K']]} valor={res} aoMudar={setRes} /></Campo>
                        <Campo rotulo="Quantidade"><Segmentado rotulo="Quantidade" opcoes={[[1, '1'], [2, '2'], [3, '3'], [4, '4']]} valor={quantidade} aoMudar={setQuantidade} /></Campo>
                    </div>
                    <span className="text-xs leading-relaxed text-cinza">Os personagens ficam salvos neste aparelho. Com o Supabase, vão aparecer em todos.</span>
                </>
            }
            resumo={[atual?.nome || 'Escolha um personagem', proporcao, res].join(' · ')}
            gerar={{ rotulo: preparando ? 'Enviando fotos...' : 'Gerar com personagem', aoGerar, desativado: !!motivo, motivo, custo }}
            feed={<Feed itens={itensDaConversa} vazio="Crie um personagem com fotos do rosto e coloque ele em qualquer cena, sempre igual." />}
        />
    );
}
