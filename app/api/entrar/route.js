// POST /api/entrar { usuario, senha, manter } -> cria a sessão
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { COOKIE, criarSessao } from '@/lib/sessao';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Trava depois de 5 erros seguidos, por 5 minutos (por endereço de internet)
const tentativas = new Map();
const LIMITE = 5;
const TRAVA_MS = 5 * 60 * 1000;

function ipDe(req) {
    return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
}

export async function POST(req) {
    const ip = ipDe(req);
    const registro = tentativas.get(ip);
    if (registro?.travadoAte > Date.now()) {
        const min = Math.ceil((registro.travadoAte - Date.now()) / 60000);
        return NextResponse.json({ erro: `Muitas tentativas erradas. Espere ${min} min e tente de novo.` }, { status: 429 });
    }

    const corpo = await req.json().catch(() => ({}));
    const usuario = String(corpo.usuario || '').trim().toLowerCase();
    const senha = String(corpo.senha || '');
    const hash = (process.env.ESTUDIO_SENHA_HASH || '').replace(/^'|'$/g, '');
    const certo = (process.env.ESTUDIO_USUARIO || '').trim().toLowerCase();

    if (!hash || !certo) {
        return NextResponse.json({ erro: 'O servidor está sem usuário e senha configurados no .env.' }, { status: 500 });
    }

    const ok = usuario === certo && senha.length > 0 && (await bcrypt.compare(senha, hash));
    if (!ok) {
        const falhas = (registro?.falhas || 0) + 1;
        tentativas.set(ip, falhas >= LIMITE ? { falhas: 0, travadoAte: Date.now() + TRAVA_MS } : { falhas });
        await new Promise((r) => setTimeout(r, 400));
        return NextResponse.json({ erro: 'Usuário ou senha incorretos.' }, { status: 401 });
    }

    tentativas.delete(ip);
    const manter = !!corpo.manter;
    const segundos = manter ? 30 * 24 * 3600 : 12 * 3600;
    const resposta = NextResponse.json({ ok: true });
    const https = req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:';
    resposta.cookies.set(COOKIE, await criarSessao(certo, segundos), {
        httpOnly: true,
        secure: https,
        sameSite: 'lax',
        path: '/',
        ...(manter ? { maxAge: segundos } : {}),
    });
    return resposta;
}
