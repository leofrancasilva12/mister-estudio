'use client';

// Tela genérica de um App: entradas (fotos/vídeos), campos e o botão Gerar.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Criador from '@/components/Criador';
import Feed from '@/components/Feed';
import Icone from '@/components/Icone';
import { Campo, Pilulas, Proporcoes, Segmentado, SlotArquivo, useEnvios } from '@/components/Controles';
import { appPorId } from '@/lib/apps';
import { useHistorico } from '@/lib/historico';
import { estimarCusto } from '@/lib/custos';

const IMG = 'image/jpeg,image/png,image/webp';

export function CamposApp({ campos, valores, mudar }) {
    return (campos || []).map((c) => {
        if (c.tipo === 'texto') {
            return (
                <Campo key={c.chave} rotulo={c.rotulo} htmlFor={`campo-${c.chave}`}>
                    <textarea id={`campo-${c.chave}`} rows={2} value={valores[c.chave] || ''} onChange={(e) => mudar(c.chave, e.target.value)} placeholder={c.placeholder} className="resize-y rounded-2xl border border-[rgba(17,17,17,0.14)] p-3 text-[15px] leading-relaxed outline-none focus:border-tinta" />
                </Campo>
            );
        }
        if (c.tipo === 'pilulas') return <Campo key={c.chave} rotulo={c.rotulo}><Pilulas rotulo={c.rotulo} opcoes={c.opcoes} valor={valores[c.chave]} aoMudar={(v) => mudar(c.chave, v)} /></Campo>;
        if (c.tipo === 'proporcao') return <Campo key={c.chave} rotulo={c.rotulo}><Proporcoes opcoes={c.opcoes} valor={valores[c.chave]} aoMudar={(v) => mudar(c.chave, v)} /></Campo>;
        return <Campo key={c.chave} rotulo={c.rotulo}><Segmentado rotulo={c.rotulo} opcoes={c.opcoes} valor={valores[c.chave]} aoMudar={(v) => mudar(c.chave, v)} /></Campo>;
    });
}

export function CabecalhoApp({ app }) {
    return (
        <div className="flex flex-col gap-2">
            <Link href="/apps" className="flex h-9 items-center gap-1 self-start text-[13px] text-cinza hover:text-tinta"><Icone nome="voltar" tamanho={16} />Apps</Link>
            <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-pedra"><Icone nome={app.icone} tamanho={20} /></span>
                <span className="flex flex-col"><span className="text-[17px] font-medium">{app.nome}</span><span className="text-xs text-cinza">{app.texto}</span></span>
            </div>
            {app.aviso && <span className="flex items-start gap-1.5 rounded-xl bg-pedra px-3 py-2 text-xs text-[#3d3d3d]"><Icone nome="aviso" tamanho={14} className="mt-0.5 flex-none" />{app.aviso}</span>}
        </div>
    );
}

export default function TelaApp({ id }) {
    const app = appPorId(id);
    const busca = useSearchParams();
    const { itensDaConversa, gerar, avisar } = useHistorico();
    const [valores, setValores] = useState(() => Object.fromEntries((app.campos || []).map((c) => [c.chave, c.padrao ?? ''])));
    const mudar = (chave, v) => setValores((atual) => ({ ...atual, [chave]: v }));
    const [ea, eb] = [app.entradas[0], app.entradas[1]];
    const envA = useEnvios(1, { avisar, aceita: ea?.aceita || IMG, limiteMb: ea?.limiteMb });
    const envB = useEnvios(1, { avisar, aceita: eb?.aceita || IMG, limiteMb: eb?.limiteMb });
    const envios = [envA, envB].slice(0, app.entradas.length);

    // Vindo do visualizador: ?imagem=... preenche a primeira entrada de imagem; ?video=... a de vídeo
    useEffect(() => {
        const img = busca.get('imagem');
        const vid = busca.get('video');
        app.entradas.forEach((e, i) => {
            const ehVideo = (e.aceita || '').startsWith('video');
            if (vid && ehVideo) envios[i].definirUrl(vid, 'Da biblioteca', 'video/mp4');
            if (img && !ehVideo && i === 0) envios[i].definirUrl(img);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busca]);

    const proximoVazio = envios.findIndex((e) => !e.itens.length);
    const anexar = () => (proximoVazio >= 0 ? envios[proximoVazio] : envios[0]).escolher();
    const soltar = useCallback((arquivos) => {
        let resto = [...arquivos];
        envios.forEach((e, i) => {
            if (!resto.length || e.itens.length) return;
            const aceita = (app.entradas[i].aceita || IMG).split(',');
            const k = resto.findIndex((f) => aceita.some((a) => f.type.startsWith(a.trim().replace('*', ''))));
            if (k >= 0) { e.soltar([resto[k]]); resto = resto.filter((_, j) => j !== k); }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [envA, envB]);

    let motivo = null;
    if (envios.some((e) => e.enviando)) motivo = 'Esperando os envios terminarem.';
    else {
        const falta = app.entradas.find((e, i) => !envios[i].urls.length);
        if (falta) motivo = `Anexe: ${falta.rotulo.toLowerCase()}.`;
        else {
            const campo = (app.campos || []).find((c) => c.obrigatorio && !String(valores[c.chave] || '').trim());
            if (campo) motivo = `Preencha: ${campo.rotulo.toLowerCase()}.`;
        }
    }

    const urls = Object.fromEntries(app.entradas.map((e, i) => [e.chave, envios[i].urls[0]]));
    const montado = motivo ? null : app.montar(valores, urls);
    const modeloPadrao = { 'trocar-pessoa-video': 'wan-animate-replace', 'copiar-movimento': 'wan-animate-move', 'estender-video': 'pixverse-extend' }[app.id];
    const custo = montado
        ? estimarCusto(montado.modeloCusto, montado.opcoesCusto)
        : modeloPadrao
            ? estimarCusto(modeloPadrao, { res: valores.res, dur: valores.dur, audio: valores.audio === 'sim' })
            : estimarCusto('nano-banana-pro', { modo: 'editar', res: valores.res || '2K' });

    const aoGerar = () => {
        if (motivo || !montado) { avisar(motivo); return; }
        gerar({
            pedido: { tipo: montado.tipo, params: montado.params },
            meta: {
                tipo: 'app', appId: app.id, midia: montado.midia, titulo: app.nome, avisoPronto: `${app.nome}: pronto`,
                prompt: valores.cena || valores.continuacao || '', modelo: montado.midia === 'video' ? (montado.params.model.startsWith('wan') ? 'Wan Animate' : 'PixVerse V6') : 'Nano Banana Pro',
                proporcao: montado.proporcao, chaveCusto: custo.chave, detalhes: app.detalhes(valores),
            },
        });
    };

    return (
        <Criador
            rotulo={app.nome}
            aoAnexar={anexar}
            rotuloAnexar={proximoVazio >= 0 ? `Anexar ${app.entradas[proximoVazio].rotulo.toLowerCase()}` : 'Anexar'}
            aoSoltar={soltar}
            anexos={app.entradas.map((e, i) => ({ envios: envios[i], rotulo: e.rotulo.split(' (')[0] }))}
            topo={
                <>
                    <CabecalhoApp app={app} />
                    <div className={`grid gap-3 ${app.entradas.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {app.entradas.map((e, i) => <SlotArquivo key={e.chave} envios={envios[i]} rotulo={e.rotulo} vazio={e.vazio} proporcao={app.entradas.length > 1 ? '1 / 1' : '16 / 9'} />)}
                    </div>
                </>
            }
            prompt={null}
            opcoes={<CamposApp campos={app.campos} valores={valores} mudar={mudar} />}
            resumo={[app.nome, envios.every((e) => e.urls.length) ? 'arquivos ok' : `${envios.filter((e) => e.urls.length).length}/${envios.length} anexos`].join(' · ')}
            gerar={{ rotulo: app.grupo === 'video' ? 'Gerar vídeo' : 'Gerar', aoGerar, desativado: !!motivo, motivo, custo }}
            feed={<Feed itens={itensDaConversa} vazio={`Toque em + para anexar ${app.entradas.map((e) => e.rotulo.toLowerCase()).join(' e ')}.`} />}
        />
    );
}
