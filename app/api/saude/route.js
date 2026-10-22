// GET /api/saude  ->  usado pelo Docker para saber se o app está de pé
import { NextResponse } from 'next/server';
import { SIMULADO } from '@/lib/kie/cliente';

export const dynamic = 'force-dynamic';

export function GET() {
    return NextResponse.json({ ok: true, modo: SIMULADO ? 'simulado' : 'kie' });
}
