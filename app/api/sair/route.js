// POST /api/sair -> apaga a sessão
import { NextResponse } from 'next/server';
import { COOKIE } from '@/lib/sessao';

export const dynamic = 'force-dynamic';

export async function POST() {
    const resposta = NextResponse.json({ ok: true });
    resposta.cookies.set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
    return resposta;
}
