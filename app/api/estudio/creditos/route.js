// GET /api/estudio/creditos  ->  { creditos }
import { NextResponse } from 'next/server';
import { consultarCreditos, ErroKie } from '@/lib/kie/cliente';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        return NextResponse.json({ creditos: await consultarCreditos() });
    } catch (e) {
        if (e instanceof ErroKie) return NextResponse.json({ erro: e.message }, { status: e.status });
        return NextResponse.json({ erro: 'Erro inesperado no servidor.' }, { status: 500 });
    }
}
