// Ícones de traço fino, desenhados à mão no estilo do Mister.
const P = {
    seta: <path d="M5 12h14M13 6l6 6-6 6" />,
    voltar: <path d="M15 6l-6 6 6 6" />,
    avancar: <path d="M9 6l6 6-6 6" />,
    baixo: <path d="M6 9l6 6 6-6" />,
    mais: <path d="M12 5v14M5 12h14" />,
    x: <path d="M6 6l12 12M18 6L6 18" />,
    baixar: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
    coracao: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
    imagem: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></>,
    video: <><rect x="3" y="5" width="13" height="14" rx="2" /><path d="M16 10l5-3v10l-5-3" /></>,
    explorar: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>,
    grade: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
    pontos: <><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></>,
    ajustes: <><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>,
    play: <path d="M8 5l11 7-11 7z" />,
    editar: <path d="M4 20h4L19 9l-4-4L4 16z" />,
    ampliar: <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />,
    rosto: <><circle cx="12" cy="9" r="5" /><path d="M10 11c.6.6 1.3.8 2 .8s1.4-.2 2-.8" /><path d="M7 21v-2a5 5 0 0 1 10 0v2" /></>,
    refazer: <><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" /><path d="M18 3v4h-4M6 21v-4h4" /></>,
    relogio: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    moeda: <><circle cx="12" cy="12" r="8" /><path d="M12 8v8M9.5 10.5h5" /></>,
    faisca: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
    lixeira: <><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" /></>,
    camera: <><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M3 7l3-4M9 7l3-4M15 7l3-4" /></>,
    onda: <path d="M4 12h1M7 9v6M10 6v12M13 9v6M16 7v10M19 10v4" />,
    aviso: <><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.5" /></>,
    copiar: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></>,
    produto: <><path d="M9 3h6v3l2 3v12H7V9l2-3z" /><path d="M9 13h6" /></>,
    retrato: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
    orbita: <><ellipse cx="12" cy="12" rx="9" ry="4" /><circle cx="12" cy="12" r="2" /></>,
    som: <><path d="M4 10v4h4l5 4V6L8 10z" /><path d="M16 9a4 4 0 0 1 0 6" /></>,
};

export default function Icone({ nome, tamanho = 18, largura = 1.5, className = '' }) {
    return (
        <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={largura} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
            {P[nome]}
        </svg>
    );
}

export function Logo({ tamanho = 28 }) {
    return (
        <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="16" cy="16" r="15" strokeWidth="1" />
            <path d="M10 21V11l6 7 6-7v10" strokeWidth="1.5" />
        </svg>
    );
}
