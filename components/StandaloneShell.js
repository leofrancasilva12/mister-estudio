'use client';

import { useState, useEffect } from 'react';
import { ImageStudio, VideoStudio, LipSyncStudio, CinemaStudio } from 'studio';

const TABS = [
  { id: 'image',   label: 'Imagem' },
  { id: 'video',   label: 'Vídeo' },
  { id: 'lipsync', label: 'Lip Sync' },
  { id: 'cinema',  label: 'Cinema' },
];

// A chave do Kie.ai fica no servidor. As telas recebem um valor qualquer só para continuar funcionando.
const SEM_CHAVE = 'servidor';

export default function StandaloneShell() {
  const [activeTab, setActiveTab] = useState('image');
  const [creditos, setCreditos] = useState(null);

  useEffect(() => {
    let vivo = true;
    const atualizar = () =>
      fetch('/api/estudio/creditos', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => vivo && setCreditos(d.erro ? null : d.creditos))
        .catch(() => {});
    atualizar();
    const t = setInterval(atualizar, 60000);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  return (
    <div className="h-screen bg-[#050505] flex flex-col overflow-hidden">
      <header className="flex-shrink-0 flex items-center justify-between gap-3 px-4 pt-4 pb-0 border-b border-white/5">
        <span className="text-white font-black text-lg tracking-wider uppercase shrink-0">Estúdio</span>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'bg-[#d9ff00] text-black' : 'text-white/50 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <span className="text-white/40 text-xs font-mono shrink-0" title="Créditos do Kie.ai">
          {creditos === null ? '' : `${Number(creditos).toLocaleString('pt-BR')} créditos`}
        </span>
      </header>

      <div className="flex-1">
        {activeTab === 'image'   && <ImageStudio   apiKey={SEM_CHAVE} />}
        {activeTab === 'video'   && <VideoStudio   apiKey={SEM_CHAVE} />}
        {activeTab === 'lipsync' && <LipSyncStudio apiKey={SEM_CHAVE} />}
        {activeTab === 'cinema'  && <CinemaStudio  apiKey={SEM_CHAVE} />}
      </div>
    </div>
  );
}
