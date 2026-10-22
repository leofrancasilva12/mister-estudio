// Sessão de login: um "crachá" assinado guardado num cookie.
// Funciona tanto no servidor quanto no middleware (usa só Web Crypto).

export const COOKIE = 'mister_sessao';
const enc = new TextEncoder();

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deB64url = (txt) => Uint8Array.from(atob(txt.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

// Chave de assinatura: SESSAO_SEGREDO do .env, ou, se não existir, derivada do hash da senha + chave do Kie.ai.
// (Trocar a senha derruba todas as sessões, o que é o desejado.)
async function chave() {
    const base = process.env.SESSAO_SEGREDO || `${process.env.ESTUDIO_SENHA_HASH || ''}|${process.env.KIE_API_KEY || ''}|mister`;
    const bruto = await crypto.subtle.digest('SHA-256', enc.encode(base));
    return crypto.subtle.importKey('raw', bruto, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function criarSessao(usuario, segundos) {
    const corpo = b64url(enc.encode(JSON.stringify({ u: usuario, exp: Date.now() + segundos * 1000 })));
    const assinatura = await crypto.subtle.sign('HMAC', await chave(), enc.encode(corpo));
    return `${corpo}.${b64url(assinatura)}`;
}

export async function lerSessao(token) {
    if (!token || typeof token !== 'string' || !token.includes('.')) return null;
    const [corpo, assinatura] = token.split('.');
    try {
        const ok = await crypto.subtle.verify('HMAC', await chave(), deB64url(assinatura), enc.encode(corpo));
        if (!ok) return null;
        const dados = JSON.parse(new TextDecoder().decode(deB64url(corpo)));
        return dados.exp > Date.now() ? dados : null;
    } catch {
        return null;
    }
}
