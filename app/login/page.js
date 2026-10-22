'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Icone, { Logo } from '@/components/Icone';

function Formulario() {
    const busca = useSearchParams();
    const [usuario, setUsuario] = useState('');
    const [senha, setSenha] = useState('');
    const [manter, setManter] = useState(true);
    const [verSenha, setVerSenha] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState('');

    const entrar = async (e) => {
        e.preventDefault();
        if (!usuario.trim() || !senha) { setErro('Preencha usuário e senha.'); return; }
        setEnviando(true);
        setErro('');
        try {
            const r = await fetch('/api/entrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario, senha, manter }) });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(d.erro || 'Não foi possível entrar.');
            // Se a tela de login apareceu no lugar de outra página, recarrega ela mesma
            if (window.location.pathname !== '/login') { window.location.reload(); return; }
            const volta = busca.get('volta');
            window.location.href = volta && volta.startsWith('/') && !volta.startsWith('//') ? volta : '/';
        } catch (e2) {
            setErro(e2.message);
            setEnviando(false);
        }
    };

    return (
        <form onSubmit={entrar} className="flex flex-col gap-[18px]" noValidate>
            <div className="flex flex-col gap-2">
                <label htmlFor="usuario" className="text-[13px] text-cinza">Usuário</label>
                <input id="usuario" autoComplete="username" autoCapitalize="none" value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="leo" className="h-[52px] rounded-xl border border-[rgba(17,17,17,0.14)] px-4 text-base outline-none focus:border-tinta" />
            </div>
            <div className="flex flex-col gap-2">
                <label htmlFor="senha" className="text-[13px] text-cinza">Senha</label>
                <div className="flex h-[52px] items-center rounded-xl border border-[rgba(17,17,17,0.14)] focus-within:border-tinta">
                    <input id="senha" type={verSenha ? 'text' : 'password'} autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" className="h-full min-w-0 flex-1 bg-transparent px-4 text-base outline-none" />
                    <button type="button" onClick={() => setVerSenha((v) => !v)} className="h-full px-4 text-[13px] text-cinza">{verSenha ? 'Esconder' : 'Mostrar'}</button>
                </div>
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-[#3d3d3d]">
                <input type="checkbox" checked={manter} onChange={(e) => setManter(e.target.checked)} className="h-[18px] w-[18px] accent-[#111111]" />
                Manter conectado neste aparelho
            </label>
            {erro && <p role="alert" className="flex items-start gap-2 text-sm text-alerta"><Icone nome="aviso" tamanho={16} className="mt-0.5 flex-none" />{erro}</p>}
            <button type="submit" disabled={enviando} className="flex h-[52px] items-center justify-center gap-2 rounded-xl bg-tinta text-base font-medium text-white disabled:opacity-60">
                {enviando ? 'Entrando...' : 'Entrar'}
                {!enviando && <Icone nome="seta" />}
            </button>
        </form>
    );
}

export default function Login() {
    return (
        <div className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-white md:flex-row">
            <div aria-hidden="true" className="relative h-[200px] flex-none overflow-hidden border-b border-fina bg-fundo md:order-2 md:h-auto md:flex-1 md:border-b-0 md:border-l">
                <div className="absolute inset-0 grid grid-cols-3 items-start gap-3 p-5 md:gap-4 md:p-14">
                    <div className="flex flex-col gap-3 md:gap-4">
                        <div className="flex aspect-[4/5] items-end rounded-2xl border border-linha bg-white p-3 font-mono text-[11px] text-cinza">4:5 · imagem</div>
                        <div className="hidden aspect-square items-end rounded-2xl bg-[#ebebe8] p-3 font-mono text-[11px] text-cinza md:flex">1:1 · produto</div>
                    </div>
                    <div className="flex flex-col gap-3 pt-6 md:gap-4 md:pt-10">
                        <div className="flex aspect-[9/16] flex-col justify-between rounded-2xl bg-tinta p-3 font-mono text-[11px] text-white"><span className="self-end">0:08</span><span className="flex items-center gap-1.5"><Icone nome="play" tamanho={13} />9:16 · vídeo</span></div>
                    </div>
                    <div className="flex flex-col gap-3 pt-2 md:gap-4">
                        <div className="flex aspect-[3/4] items-end rounded-2xl bg-[#e4e4e0] p-3 font-mono text-[11px] text-[#4a4a4a]">3:4 · retrato</div>
                        <div className="hidden flex-col gap-2.5 rounded-2xl border border-linha bg-white p-3.5 md:flex">
                            <span className="flex h-7 items-center gap-[3px]">{[30, 70, 45, 90, 55, 35, 80, 40, 65, 25, 50].map((h, i) => <span key={i} className="w-0.5 rounded bg-tinta" style={{ height: `${h}%` }} />)}</span>
                            <span className="font-mono text-[11px] text-cinza">voz · 0:14</span>
                        </div>
                    </div>
                </div>
            </div>
            <main className="flex flex-1 flex-col gap-10 px-6 pb-8 pt-7 md:max-w-[640px] md:px-[clamp(24px,6vw,88px)] md:pt-10">
                <div className="flex items-center gap-2.5"><Logo /><span className="text-[19px] font-bold tracking-[-0.045em]">Mister Studio</span></div>
                <div className="flex w-full max-w-[380px] animate-subir flex-col gap-8 md:mt-10">
                    <div className="flex flex-col gap-2.5">
                        <h1 className="text-[30px] font-medium leading-[1.08] tracking-[-0.035em] md:text-[40px]">Entre no seu estúdio</h1>
                        <p className="text-[15px] leading-relaxed text-cinza">Imagens, vídeos, vozes e avatares falantes, gerados com os melhores modelos de IA.</p>
                    </div>
                    <Suspense><Formulario /></Suspense>
                </div>
                <div className="flex-1" />
                <p className="flex items-center gap-1.5 text-xs text-suave"><Icone nome="cadeado" tamanho={14} />Servidor privado · a chave do Kie.ai nunca sai do servidor</p>
            </main>
        </div>
    );
}
