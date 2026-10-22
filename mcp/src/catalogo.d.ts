export class PedidoInvalido extends Error {}
export const CATALOGO: Record<string, { tipo: string | string[]; montar: (p: Record<string, unknown>) => { model: string; input: Record<string, unknown> } }>;
