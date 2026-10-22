import Link from 'next/link';
import Icone from '@/components/Icone';
import { APPS } from '@/lib/apps';

export const metadata = { title: 'Apps · Mister Studio' };

function Grupo({ titulo, apps }) {
    return (
        <section className="flex flex-col gap-4">
            <h2 className="text-xl font-medium tracking-tight">{titulo}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {apps.map((a) => (
                    <Link key={a.id} href={a.link || `/apps/${a.id}`} className="flex items-center gap-3.5 rounded-[18px] border border-fina p-4 transition-all hover:-translate-y-0.5 hover:border-tinta/30">
                        <span className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-[14px] bg-pedra"><Icone nome={a.icone} tamanho={22} /></span>
                        <span className="flex flex-col gap-1"><span className="text-[15px] font-medium">{a.nome}</span><span className="text-[13px] leading-snug text-cinza">{a.texto}</span></span>
                    </Link>
                ))}
            </div>
        </section>
    );
}

export default function Apps() {
    return (
        <main className="mx-auto flex w-full max-w-[1280px] animate-subir flex-col gap-10 px-4 pb-28 pt-7 md:px-8 md:pb-16">
            <div className="flex flex-col gap-1.5">
                <h1 className="text-[28px] font-medium tracking-[-0.03em]">Apps</h1>
                <p className="text-[15px] text-cinza">Ferramentas prontas: você manda as fotos, o Estúdio cuida do prompt.</p>
            </div>
            <Grupo titulo="Imagem" apps={APPS.filter((a) => a.grupo === 'imagem')} />
            <Grupo titulo="Vídeo" apps={APPS.filter((a) => a.grupo === 'video')} />
        </main>
    );
}
