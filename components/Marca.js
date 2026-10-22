'use client';

// Marca Mister Studio em vetor (preto sobre branco) e a abertura animada do app.
import { useEffect, useState } from 'react';

export const CHAVE_ABERTURA = 'mister-estudio:abertura';
export { default as Simbolo } from './Simbolo';
import Simbolo from './Simbolo';

export function NomeMarca({ className = '' }) {
    return <span className={`font-bold tracking-[-0.045em] ${className}`}>Mister<span className="ml-[0.06em]">Studio</span></span>;
}

// Abertura: aparece uma vez por sessão (o script no layout esconde nas próximas telas).
export function Abertura() {
    const [visivel, setVisivel] = useState(true);
    const [saindo, setSaindo] = useState(false);
    useEffect(() => {
        let jaViu = false;
        try { jaViu = !!sessionStorage.getItem(CHAVE_ABERTURA); sessionStorage.setItem(CHAVE_ABERTURA, '1'); } catch { /* sem armazenamento: mostra */ }
        if (jaViu) { setVisivel(false); return undefined; }
        const t1 = setTimeout(() => setSaindo(true), 2100);
        const t2 = setTimeout(() => setVisivel(false), 2450);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);
    if (!visivel) return null;
    const pular = () => { setSaindo(true); setTimeout(() => setVisivel(false), 300); };
    return (
        <div
            role="presentation"
            onClick={pular}
            className={`abertura fixed inset-0 z-[90] flex cursor-pointer flex-col items-center justify-center gap-6 bg-white text-tinta transition-opacity duration-300 ${saindo ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        >
            <Simbolo largura={150} animado />
            <div className="flex flex-col items-center gap-3">
                <NomeMarca className="ab-nome text-[40px] leading-none md:text-[52px]" />
                <span className="ab-frase text-[11px] font-medium uppercase text-[#3d3d3d] md:text-[12px]">Vídeos com inteligência</span>
                <span aria-hidden="true" className="ab-fio mt-1 block h-px w-[140px] md:w-[180px]" style={{ background: 'linear-gradient(90deg, transparent, #D4AF37 20%, #F3DE9A 50%, #D4AF37 80%, transparent)' }} />
            </div>
            <span className="sr-only">Mister Studio</span>
        </div>
    );
}
