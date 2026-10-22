'use client';

// Editar com pincel: a pessoa pinta a área, e o Ideogram V3 Edit refaz só aquele pedaço.
// A máscara vai no tamanho real da imagem: fundo branco, área pintada em preto (preto = editar).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Criador from '@/components/Criador';
import Feed from '@/components/Feed';
import Icone from '@/components/Icone';
import { Campo, Segmentado, SlotArquivo, useEnvios } from '@/components/Controles';
import { appPorId } from '@/lib/apps';
import { useHistorico } from '@/lib/historico';
import { enviarArquivo } from '@/lib/api';
import { estimarCusto } from '@/lib/custos';
import { CabecalhoApp } from './tela';

function Tela({ src, tracos, setTracos, tamanho, borracha }) {
    const caixa = useRef(null);
    const tela = useRef(null);
    const [natural, setNatural] = useState(null);
    const desenhando = useRef(false);

    // Redesenha os traços por cima da foto (em vermelho translúcido)
    useEffect(() => {
        const c = tela.current;
        if (!c || !natural) return;
        c.width = natural.w; c.height = natural.h;
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, c.width, c.height);
        desenharTracos(ctx, tracos, 'rgba(255,59,48,1)');
    }, [tracos, natural]);

    const ponto = (e) => {
        const r = tela.current.getBoundingClientRect();
        return [((e.clientX - r.left) / r.width) * natural.w, ((e.clientY - r.top) / r.height) * natural.h];
    };
    const escala = () => (natural ? natural.w / tela.current.getBoundingClientRect().width : 1);

    const baixo = (e) => {
        if (!natural) return;
        e.preventDefault();
        tela.current.setPointerCapture(e.pointerId);
        desenhando.current = true;
        setTracos((t) => [...t, { borracha, largura: tamanho * escala(), pontos: [ponto(e)] }]);
    };
    const mover = (e) => {
        if (!desenhando.current) return;
        const p = ponto(e);
        setTracos((t) => {
            const ult = t[t.length - 1];
            return [...t.slice(0, -1), { ...ult, pontos: [...ult.pontos, p] }];
        });
    };
    const cima = () => { desenhando.current = false; };

    return (
        <div ref={caixa} className="relative w-full overflow-hidden rounded-2xl bg-pedra">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="Imagem para editar" className="block w-full select-none" draggable={false} onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
            <canvas
                ref={tela}
                aria-label="Área de pintura: pinte o que quer mudar"
                className="absolute inset-0 h-full w-full cursor-crosshair opacity-45"
                style={{ touchAction: 'none' }}
                onPointerDown={baixo} onPointerMove={mover} onPointerUp={cima} onPointerCancel={cima} onPointerLeave={cima}
            />
        </div>
    );
}

function desenharTracos(ctx, tracos, cor) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const t of tracos) {
        ctx.globalCompositeOperation = t.borracha ? 'destination-out' : 'source-over';
        ctx.strokeStyle = cor; ctx.fillStyle = cor;
        ctx.lineWidth = t.largura;
        const [p0, ...resto] = t.pontos;
        if (!resto.length) { ctx.beginPath(); ctx.arc(p0[0], p0[1], t.largura / 2, 0, Math.PI * 2); ctx.fill(); continue; }
        ctx.beginPath(); ctx.moveTo(p0[0], p0[1]);
        for (const p of resto) ctx.lineTo(p[0], p[1]);
        ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
}

// Máscara final: branco = manter, preto = editar
function montarMascara(src, tracos) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const w = img.naturalWidth; const h = img.naturalHeight;
            const pintura = document.createElement('canvas');
            pintura.width = w; pintura.height = h;
            desenharTracos(pintura.getContext('2d'), tracos, '#000');
            const m = document.createElement('canvas');
            m.width = w; m.height = h;
            const ctx = m.getContext('2d');
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
            ctx.drawImage(pintura, 0, 0);
            m.toBlob((b) => (b ? resolve(new File([b], 'mascara.png', { type: 'image/png' })) : reject(new Error('Não consegui montar a máscara.'))), 'image/png');
        };
        img.onerror = () => reject(new Error('Não consegui ler a imagem.'));
        img.src = src;
    });
}

export default function TelaPincel() {
    const app = appPorId('pincel');
    const busca = useSearchParams();
    const { itensDaConversa, gerar, avisar } = useHistorico();
    const envios = useEnvios(1, { avisar });
    const [tracos, setTracos] = useState([]);
    const [tamanho, setTamanho] = useState(40);
    const [borracha, setBorracha] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [velocidade, setVelocidade] = useState('BALANCED');
    const [preparando, setPreparando] = useState(false);

    useEffect(() => {
        const img = busca.get('imagem');
        if (img) envios.definirUrl(img);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busca]);

    const item = envios.itens[0];
    const src = item?.previa || item?.url || null;
    const url = envios.urls[0];
    useEffect(() => { setTracos([]); }, [src]);

    const pintou = tracos.some((t) => !t.borracha);
    const custo = estimarCusto('ideogram-v3-edit', { res: velocidade });
    let motivo = null;
    if (envios.enviando) motivo = 'Esperando o envio terminar.';
    else if (!url) motivo = 'Anexe a imagem que quer editar.';
    else if (!pintou) motivo = 'Pinte a área que quer mudar.';
    else if (!prompt.trim()) motivo = 'Diga o que colocar na área pintada.';
    else if (preparando) motivo = 'Enviando a máscara...';

    const aoGerar = async () => {
        if (motivo) { avisar(motivo); return; }
        setPreparando(true);
        try {
            const mascara = await montarMascara(src, tracos);
            const mask_url = await enviarArquivo(mascara);
            gerar({
                pedido: { tipo: 'edicao', params: { model: 'ideogram-v3-edit', image_url: url, mask_url, prompt: prompt.trim(), resolution: velocidade } },
                meta: { tipo: 'app', appId: 'pincel', midia: 'imagem', titulo: app.nome, avisoPronto: 'Edição pronta', prompt: prompt.trim(), modelo: 'Ideogram V3 Edit', chaveCusto: custo.chave, detalhes: `Pincel · ${velocidade.toLowerCase()}` },
            });
        } catch (e) {
            avisar(e.message);
        } finally {
            setPreparando(false);
        }
    };

    const soltar = useCallback((arquivos) => { if (arquivos[0]) envios.soltar([arquivos[0]]); }, [envios]);

    return (
        <Criador
            rotulo={app.nome}
            aoAnexar={envios.escolher}
            rotuloAnexar="Anexar imagem"
            aoSoltar={soltar}
            anexos={[{ envios, rotulo: 'Imagem' }]}
            topo={
                <>
                    <CabecalhoApp app={app} />
                    {src ? (
                        <div className="flex flex-col gap-3">
                            <Tela src={src} tracos={tracos} setTracos={setTracos} tamanho={tamanho} borracha={borracha} />
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="w-[200px]"><Segmentado rotulo="Ferramenta" opcoes={[[false, 'Pincel'], [true, 'Borracha']]} valor={borracha} aoMudar={setBorracha} /></div>
                                <button type="button" onClick={() => setTracos((t) => t.slice(0, -1))} disabled={!tracos.length} className="h-10 rounded-xl border border-linha px-3 text-[13px] disabled:opacity-40">Desfazer</button>
                                <button type="button" onClick={() => setTracos([])} disabled={!tracos.length} className="h-10 rounded-xl border border-linha px-3 text-[13px] disabled:opacity-40">Limpar</button>
                                <button type="button" onClick={() => { envios.limpar(); }} aria-label="Trocar imagem" className="ml-auto flex h-10 items-center gap-1 rounded-xl px-2 text-[13px] text-cinza hover:text-tinta"><Icone nome="refazer" tamanho={14} />Trocar</button>
                            </div>
                            <label className="flex items-center gap-3 text-xs text-cinza">
                                Tamanho
                                <input type="range" min={8} max={140} value={tamanho} onChange={(e) => setTamanho(Number(e.target.value))} className="flex-1 accent-[#111]" aria-label="Tamanho do pincel" />
                                <span className="w-8 text-right tabular-nums">{tamanho}</span>
                            </label>
                        </div>
                    ) : (
                        <SlotArquivo envios={envios} rotulo="Imagem" vazio="Anexar imagem para pintar" proporcao="16 / 10" />
                    )}
                </>
            }
            prompt={{ valor: prompt, aoMudar: setPrompt, rotulo: 'O que colocar na área pintada', placeholder: 'Ex.: óculos de sol pretos, mesmo ângulo e luz', max: 2000, linhas: 3 }}
            opcoes={<Campo rotulo="Velocidade"><Segmentado rotulo="Velocidade" opcoes={[['TURBO', 'Rápida'], ['BALANCED', 'Equilibrada'], ['QUALITY', 'Qualidade']]} valor={velocidade} aoMudar={setVelocidade} /></Campo>}
            resumo={['Pincel', pintou ? 'área pintada' : 'sem pintura', velocidade.toLowerCase()].join(' · ')}
            gerar={{ rotulo: preparando ? 'Enviando...' : 'Aplicar edição', aoGerar, desativado: !!motivo, motivo, custo }}
            feed={<Feed itens={itensDaConversa} vazio="Anexe uma imagem, pinte a área e diga o que colocar no lugar." />}
        />
    );
}
