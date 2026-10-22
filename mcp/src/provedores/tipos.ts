// O "contrato" que todo provedor de IA precisa seguir.
// O simulador e o Kie.ai implementam as mesmas funções, então as ferramentas
// não precisam saber qual dos dois está sendo usado. Trocar um pelo outro
// é só mudar a variável PROVEDOR.

export type TipoMidia = "imagem" | "video" | "audio" | "falante";

export type Formato = "1:1" | "4:5" | "9:16" | "16:9";

export interface PedidoGeracao {
  tipo: TipoMidia;
  prompt: string;
  promptOriginal?: string; // o que a pessoa pediu, antes de juntar a descrição do personagem
  formato: Formato;
  duracaoSegundos?: number; // só para vídeo
  referencias?: string[]; // links de imagens de referência (ex.: fotos do personagem)
  modelo?: string; // ex.: nano-banana-pro, gpt-image-2, kling-3, veo-3-1-rapido
  qualidade?: string; // imagem: 1K, 2K ou 4K
  imagemInicial?: string; // vídeo: anima a partir desta imagem; falante: o retrato
  voz?: string; // áudio: nome da voz (ex.: Laura)
  falas?: { voz: string; texto: string }[]; // diálogo
  audioUrl?: string; // falante: o áudio da fala
  velocidade?: number; // áudio: 0.7 a 1.2
}

export type SituacaoTarefa = "na_fila" | "gerando" | "pronta" | "falhou";

export interface Tarefa {
  id: string;
  pedido: PedidoGeracao;
  situacao: SituacaoTarefa;
  progresso: number; // de 0 a 100
  resultadoUrl?: string;
  erro?: string;
  creditos?: number; // créditos que o Kie.ai cobrou
  modeloKie?: string;
  criadaEm: string;
}

export interface Provedor {
  nome: string;
  iniciar(pedido: PedidoGeracao): Promise<Tarefa>;
  consultar(id: string): Promise<Tarefa | undefined>;
}
