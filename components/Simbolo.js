// Símbolo Mister Studio: M, play e lente em preto, com contorno dourado.
// Sem hooks, para servir tanto em telas do servidor quanto do navegador.
const CAIXA = '590 105 585 385';
export const OURO = ['#F3DE9A', '#D4AF37', '#A67C1F'];

export default function Simbolo({ largura = 40, animado = false, className = '' }) {
    // Em tamanhos pequenos o contorno engrossa um pouco para continuar visível
    const c = largura < 70 ? 20 : 11;
    const id = `ouro-${largura}${animado ? '-a' : ''}`;
    const ouro = `url(#${id})`;
    return (
        <svg width={largura} height={Math.round((largura * 385) / 585)} viewBox={CAIXA} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor={OURO[0]} />
                    <stop offset="0.5" stopColor={OURO[1]} />
                    <stop offset="1" stopColor={OURO[2]} />
                </linearGradient>
            </defs>
            <path className={animado ? 'ab-m-ouro' : undefined} d="M681 414V190L830 268L979 190V414" fill="none" stroke={ouro} strokeWidth={62 + 2 * c} pathLength="1" />
            <path className={animado ? 'ab-m-preto' : undefined} d="M681 414V190L830 268L979 190V414" fill="none" stroke="#111" strokeWidth="62" />
            <g className={animado ? 'ab-play' : undefined}>
                <path d="M767 304V411L861 357.5Z" fill={ouro} stroke={ouro} strokeWidth={16 + 2 * c} />
                <path d="M767 304V411L861 357.5Z" fill="#111" stroke="#111" strokeWidth="16" />
            </g>
            <g className={animado ? 'ab-lente' : undefined}>
                <path d="M1042 260L1112 223V397L1042 360Z" fill={ouro} stroke={ouro} strokeWidth={16 + 2 * c} />
                <path d="M1042 260L1112 223V397L1042 360Z" fill="#111" stroke="#111" strokeWidth="16" />
            </g>
        </svg>
    );
}
