// Porteiro: sem login, nenhuma tela abre e nenhuma rota do servidor responde.
import { NextResponse } from 'next/server';
import { COOKIE, lerSessao } from '@/lib/sessao';

const LIVRES = ['/login', '/api/entrar', '/api/saude'];

export async function middleware(req) {
    const { pathname } = req.nextUrl;
    // Marca para o layout esconder cabeçalho e barra quando a tela é a de login
    const comMarca = () => { const h = new Headers(req.headers); h.set('x-tela-login', '1'); return h; };
    if (pathname === '/login') return NextResponse.next({ request: { headers: comMarca() } });
    if (LIVRES.includes(pathname)) return NextResponse.next();

    const sessao = await lerSessao(req.cookies.get(COOKIE)?.value);
    if (sessao) return NextResponse.next();

    if (pathname.startsWith('/api/')) {
        return NextResponse.json({ erro: 'Sua sessão expirou. Entre de novo.' }, { status: 401 });
    }
    // Mostra a tela de login no próprio endereço pedido (sem redirecionar).
    // Depois de entrar, a página recarrega e abre o que a pessoa queria.
    return NextResponse.rewrite(new URL('/login', req.url), { request: { headers: comMarca() } });
}

export const config = {
    // Ícones e manifesto ficam livres: o celular busca sem estar logado ao instalar
    matcher: ['/((?!_next/static|_next/image|icone|favicon|manifest.webmanifest).*)'],
};
