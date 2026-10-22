// POST /api/estudio/melhorar { prompt, tipo } -> { prompt } reescrito em inglês detalhado, usando um modelo de chat do Kie.ai
import { NextResponse } from 'next/server';
import { SIMULADO } from '@/lib/kie/cliente';

export const dynamic = 'force-dynamic';

const API = process.env.KIE_API_BASE || 'https://api.kie.ai';
// Modelos de chat do Kie.ai (o primeiro que responder é usado). Dá para trocar no .env com KIE_LLM.
const MODELOS = (process.env.KIE_LLM || 'gemini-3-8-flash-openai,gemini-3-6-flash-openai').split(',').map((m) => m.trim()).filter(Boolean);

const INSTRUCOES = {
    imagem: 'You rewrite prompts for AI image generation. Expand the user idea into one rich, concrete English prompt: subject, setting, composition, lighting, lens/camera feel, mood, materials and style. Keep every specific detail the user gave (brands, text in quotes, colors, people). No lists, no explanations, no quotes around it. Max 120 words.',
    video: 'You rewrite prompts for AI video generation. Expand the user idea into one English prompt describing subject, action over time, camera movement, setting, lighting and mood. Keep every specific detail the user gave. No lists, no explanations. Max 100 words.',
};

export async function POST(req) {
    const corpo = await req.json().catch(() => ({}));
    const original = String(corpo.prompt || '').trim().slice(0, 4000);
    if (!original) return NextResponse.json({ erro: 'Escreva uma ideia antes de melhorar.' }, { status: 400 });
    if (SIMULADO) return NextResponse.json({ prompt: `${original}, cinematic soft light, rich detail, 35mm photo, natural colors` });
    const chave = process.env.KIE_API_KEY;
    if (!chave) return NextResponse.json({ erro: 'Falta a KIE_API_KEY no servidor.' }, { status: 500 });

    let ultimoErro = 'O assistente de prompt não respondeu.';
    for (const modelo of MODELOS) {
        try {
            const r = await fetch(`${API}/${modelo}/v1/chat/completions`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stream: false,
                    messages: [
                        { role: 'system', content: [{ type: 'text', text: INSTRUCOES[corpo.tipo] || INSTRUCOES.imagem }] },
                        { role: 'user', content: [{ type: 'text', text: original }] },
                    ],
                }),
                signal: AbortSignal.timeout(45000),
            });
            const d = await r.json().catch(() => null);
            const textoNovo = d?.choices?.[0]?.message?.content;
            if (typeof textoNovo === 'string' && textoNovo.trim()) return NextResponse.json({ prompt: textoNovo.trim().replace(/^"|"$/g, '') });
            ultimoErro = d?.msg ? `Kie.ai: ${d.msg}` : ultimoErro;
        } catch {
            ultimoErro = 'Não consegui falar com o assistente de prompt.';
        }
    }
    return NextResponse.json({ erro: ultimoErro }, { status: 502 });
}
