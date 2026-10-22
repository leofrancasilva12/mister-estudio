import { NextResponse } from 'next/server';

// "Enviar para o Studio": repassa um personagem do site para o MCP (o conector do Claude).
// Os dois rodam na mesma VPS; a conversa acontece pela rede interna do Docker,
// com a mesma chave do conector (MCP_TOKEN). Nada disso fica exposto na internet.

export const runtime = 'nodejs';

const MCP = process.env.MCP_URL_INTERNA || 'http://estudio-mcp:3333';
const TIPOS = /^data:image\/(jpeg|png|webp);base64,/i;

export async function POST(req) {
    const chave = process.env.MCP_TOKEN;
    if (!chave) return NextResponse.json({ erro: 'Falta a MCP_TOKEN no .env da VPS.' }, { status: 500 });

    let corpo;
    try { corpo = await req.json(); } catch { return NextResponse.json({ erro: 'Pedido inválido.' }, { status: 400 }); }
    const nome = String(corpo?.nome || '').trim();
    const descricao = String(corpo?.descricao || '').trim();
    const fotos = Array.isArray(corpo?.fotos) ? corpo.fotos.filter((f) => typeof f === 'string' && TIPOS.test(f)) : [];
    if (nome.length < 2) return NextResponse.json({ erro: 'Dê um nome ao personagem.' }, { status: 400 });
    if (descricao.length < 10) return NextResponse.json({ erro: 'Escreva uma descrição física com pelo menos 10 letras.' }, { status: 400 });
    if (fotos.length < 1 || fotos.length > 4) return NextResponse.json({ erro: 'O personagem precisa ter de 1 a 4 fotos.' }, { status: 400 });

    let resposta;
    try {
        resposta = await fetch(`${MCP}/interno/personagens`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chave}` },
            body: JSON.stringify({ nome, descricao, fotos_base64: fotos }),
            signal: AbortSignal.timeout(180000),
        });
    } catch {
        return NextResponse.json({ erro: 'Não consegui falar com o Studio. Ele está ligado na VPS?' }, { status: 502 });
    }
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) return NextResponse.json({ erro: dados?.erro || `O Studio respondeu com erro ${resposta.status}.` }, { status: resposta.status === 409 ? 409 : 502 });
    return NextResponse.json({ ok: true, nome: dados.nome, fotos: dados.fotos });
}
