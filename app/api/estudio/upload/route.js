// POST /api/estudio/upload  (formulário com o campo "file")  ->  { url }
import { NextResponse } from 'next/server';
import { enviarArquivo, ErroKie } from '@/lib/kie/cliente';

export const dynamic = 'force-dynamic';

const LIMITE_MB = Number(process.env.UPLOAD_LIMITE_MB || 50);
const TIPOS = /^(image|audio|video)\//;

export async function POST(req) {
    try {
        const form = await req.formData().catch(() => null);
        const arquivo = form?.get('file');
        if (!arquivo || typeof arquivo === 'string') {
            return NextResponse.json({ erro: 'Nenhum arquivo recebido.' }, { status: 400 });
        }
        if (!TIPOS.test(arquivo.type || '')) {
            return NextResponse.json({ erro: 'Envie só imagem, áudio ou vídeo.' }, { status: 415 });
        }
        if (arquivo.size > LIMITE_MB * 1024 * 1024) {
            return NextResponse.json({ erro: `Arquivo maior que ${LIMITE_MB} MB.` }, { status: 413 });
        }
        return NextResponse.json({ url: await enviarArquivo(arquivo) });
    } catch (e) {
        if (e instanceof ErroKie) return NextResponse.json({ erro: e.message }, { status: e.status });
        console.error('[upload]', e);
        return NextResponse.json({ erro: 'Erro inesperado no envio.' }, { status: 500 });
    }
}
