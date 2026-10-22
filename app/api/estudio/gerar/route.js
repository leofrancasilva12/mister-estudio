// POST /api/estudio/gerar  { tipo, params }  ->  { id }
import { NextResponse } from 'next/server';
import { montarPedido, PedidoInvalido } from '@/lib/kie/catalogo';
import { criarTarefa, ErroKie } from '@/lib/kie/cliente';

export const dynamic = 'force-dynamic';

const TIPOS = ['imagem', 'edicao', 'video', 'imagem-video', 'lipsync', 'audio', 'ferramenta'];

export async function POST(req) {
    try {
        const corpo = await req.json().catch(() => null);
        if (!corpo || !TIPOS.includes(corpo.tipo)) {
            return NextResponse.json({ erro: 'Pedido inválido.' }, { status: 400 });
        }
        const pedido = montarPedido(corpo.tipo, corpo.params);
        const id = await criarTarefa(pedido);
        return NextResponse.json({ id });
    } catch (e) {
        if (e instanceof PedidoInvalido) return NextResponse.json({ erro: e.message }, { status: 400 });
        if (e instanceof ErroKie) return NextResponse.json({ erro: e.message }, { status: e.status });
        console.error('[gerar]', e);
        return NextResponse.json({ erro: 'Erro inesperado no servidor.' }, { status: 500 });
    }
}
