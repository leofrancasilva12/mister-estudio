import type { Tarefa } from "./provedores/tipos.js";

// A galeria guarda tudo que ficou pronto.
// Nesta etapa ela fica na memória (some quando o servidor reinicia).
// Na etapa do Supabase, estas mesmas funções passam a gravar no banco,
// e a galeria do app e a do Claude viram uma só.

export interface ItemGaleria {
  id: string;
  tipo: "imagem" | "video" | "audio" | "falante";
  prompt: string;
  formato: string;
  url: string;
  criadoEm: string;
}

export interface Personagem {
  nome: string;
  descricao: string;
  referencias: string[];
}

const itens: ItemGaleria[] = [];

// Personagens de exemplo. Depois viram uma tabela no Supabase.
const personagens: Personagem[] = [
  {
    nome: "Porta-voz 3D",
    descricao:
      "Avatar 3D da dona da Viva Mais Bella, estilo animação 3D, simpática, cabelo e traços baseados nas fotos de referência.",
    referencias: [],
  },
];

export function salvarNaGaleria(tarefa: Tarefa): ItemGaleria | undefined {
  if (tarefa.situacao !== "pronta" || !tarefa.resultadoUrl) return undefined;
  const existente = itens.find((i) => i.id === tarefa.id);
  if (existente) return existente;
  const item: ItemGaleria = {
    id: tarefa.id,
    tipo: tarefa.pedido.tipo,
    prompt: tarefa.pedido.promptOriginal ?? tarefa.pedido.prompt,
    formato: tarefa.pedido.formato,
    url: tarefa.resultadoUrl,
    criadoEm: new Date().toISOString(),
  };
  itens.unshift(item);
  return item;
}

export function listarGaleria(limite: number, tipo?: ItemGaleria["tipo"]): ItemGaleria[] {
  return itens.filter((i) => !tipo || i.tipo === tipo).slice(0, limite);
}

export function listarPersonagens(): Personagem[] {
  return personagens;
}

export function buscarPersonagem(nome: string): Personagem | undefined {
  const alvo = nome.trim().toLowerCase();
  return personagens.find((p) => p.nome.toLowerCase() === alvo);
}
