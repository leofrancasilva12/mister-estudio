// O "contrato" que todo provedor de IA precisa seguir.
// O simulador e o Kie.ai implementam as mesmas funções, então as ferramentas
// não precisam saber qual dos dois está sendo usado. Trocar um pelo outro
// é só mudar a variável PROVEDOR.

export type TipoMidia = "imagem" | "video";

export type Formato = "1:1" | "4:5" | "9:16" | "16:9";

export interface PedidoGeracao {
  tipo: TipoMidia;
  prompt: string;
  promptOriginal?: string; // o que a pessoa pediu, antes de juntar a descrição do personagem
  formato: Formato;
  duracaoSegundos?: number; // só para vídeo
  referencias?: string[]; // links de imagens de referência (ex.: fotos do personagem)
}

export type SituacaoTarefa = "na_fila" | "gerando" | "pronta" | "falhou";

export interface Tarefa {
  id: string;
  pedido: PedidoGeracao;
  situacao: SituacaoTarefa;
  progresso: number; // de 0 a 100
  resultadoUrl?: string;
  erro?: string;
  criadaEm: string;
}

export interface Provedor {
  nome: string;
  iniciar(pedido: PedidoGeracao): Promise<Tarefa>;
  consultar(id: string): Promise<Tarefa | undefined>;
}
