// GET /api/estudio/tarefa?id=...  ->  { estado: 'gerando' | 'pronto' | 'falhou', urls?, motivo?, progresso? }
import { NextResponse } from 'next/server';
import { consultarTarefa, ErroKie } from '@/lib/kie/cliente';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    const id = new URL(req.url).searchParams.get('id') || '';
    if (!/^[\w.-]{1,128}$/.test(id)) return NextResponse.json({ erro: 'Número de tarefa inválido.' }, { status: 400 });
    try {
        return NextResponse.json(await consultarTarefa(id));
    } catch (e) {
        if (e instanceof ErroKie) return NextResponse.json({ erro: e.message }, { status: e.status });
        console.error('[tarefa]', e);
        return NextResponse.json({ erro: 'Erro inesperado no servidor.' }, { status: 500 });
    }
}
