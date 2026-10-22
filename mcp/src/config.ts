// Configurações do servidor, lidas das variáveis de ambiente (arquivo .env ou Docker).
// Assim nenhuma senha fica escrita no código.

export const config = {
  // "http" para rodar na VPS e conectar no Claude pela internet.
  // "stdio" para rodar no computador e conectar no Claude Desktop ou Claude Code.
  modo: (process.env.MODO ?? "http") as "http" | "stdio",

  porta: Number(process.env.PORTA ?? 3333),
  host: process.env.HOST ?? "127.0.0.1",

  // Endereços pelos quais o servidor pode ser acessado (ex.: mcp.seudominio.com.br).
  hostsPermitidos: (process.env.HOSTS_PERMITIDOS ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean),

  // Chave que o Claude precisa enviar para usar o servidor.
  tokenAcesso: process.env.MCP_TOKEN ?? "",

  // "simulado" devolve imagens de mentira, sem gastar créditos.
  // "kie" usa a API do Kie.ai de verdade (próxima etapa).
  provedor: (process.env.PROVEDOR ?? "simulado") as "simulado" | "kie",

  // Teto de créditos por dia gastos pelo Claude (proteção contra uso exagerado). 0 = sem teto.
  limiteDiario: Number(process.env.MCP_LIMITE_CREDITOS_DIA ?? 600),

  // Quantos segundos a geração simulada demora, para imitar a vida real.
  segundosSimulados: Number(process.env.SEGUNDOS_SIMULADOS ?? 8),
};
