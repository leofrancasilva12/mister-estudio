import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Pesquisa na web com fontes, usando os modelos Sonar da Perplexity pelo OpenRouter.
// A chave do OpenRouter fica só no servidor (OPENROUTER_API_KEY).

const API = process.env.OPENROUTER_BASE ?? "https://openrouter.ai/api/v1";
const LIMITE_USD_DIA = Number(process.env.PESQUISA_LIMITE_USD_DIA ?? 2);

const NIVEIS = {
  rapida: { modelo: "perplexity/sonar", estimativa: 0.01, rotulo: "Sonar (rápida)" },
  completa: { modelo: "perplexity/sonar-pro", estimativa: 0.06, rotulo: "Sonar Pro (completa)" },
  raciocinio: { modelo: "perplexity/sonar-reasoning-pro", estimativa: 0.05, rotulo: "Sonar Reasoning Pro (compara e conclui)" },
} as const;
const PROFUNDA = { modelo: "perplexity/sonar-deep-research", estimativa: 0.8, rotulo: "Sonar Deep Research" };

const INSTRUCOES =
  "Você é um pesquisador. Responda em português do Brasil, de forma objetiva e organizada. " +
  "Priorize fontes confiáveis e recentes. Quando houver números, datas ou preços, diga de quando é a informação. " +
  "Se as fontes discordarem, mostre os dois lados. Não invente: se não encontrar, diga.";

// ---------- Teto diário de gasto (em dólares) ----------
const gasto = { dia: "", total: 0 };
const hoje = () => new Date().toISOString().slice(0, 10);
function zerarSeMudouDia() { if (gasto.dia !== hoje()) { gasto.dia = hoje(); gasto.total = 0; } }
function conferirTeto(estimativa: number): string | null {
  zerarSeMudouDia();
  if (LIMITE_USD_DIA > 0 && gasto.total + estimativa > LIMITE_USD_DIA) {
    return `Parei para proteger seu saldo: hoje as pesquisas já gastaram US$ ${gasto.total.toFixed(3)} e o teto diário é US$ ${LIMITE_USD_DIA.toFixed(2)}. Para mudar, ajuste PESQUISA_LIMITE_USD_DIA no .env da VPS.`;
  }
  return null;
}

type Resultado = { texto: string; fontes: string[]; custo: number | null; modelo: string };

async function perguntar(modelo: string, pergunta: string, contexto: string | undefined, tempoMs: number): Promise<Resultado> {
  const chave = process.env.OPENROUTER_API_KEY;
  if (!chave) throw new Error("Falta a OPENROUTER_API_KEY no servidor da pesquisa.");
  const mensagens = [
    { role: "system", content: INSTRUCOES + (contexto ? `\nContexto do pedido: ${contexto}` : "") },
    { role: "user", content: pergunta },
  ];
  let r: globalThis.Response;
  try {
    r = await fetch(`${API}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/leofrancasilva12/mister-estudio",
        "X-Title": "Mister Pesquisa",
      },
      body: JSON.stringify({ model: modelo, messages: mensagens, usage: { include: true } }),
      signal: AbortSignal.timeout(tempoMs),
    });
  } catch (e) {
    throw new Error((e as Error).name === "TimeoutError" ? "A pesquisa demorou demais. Tente de novo ou use um nível mais rápido." : "Não consegui falar com o OpenRouter.");
  }
  const d: any = await r.json().catch(() => null);
  if (!r.ok || d?.error) {
    const msg = d?.error?.message ?? `erro ${r.status}`;
    if (r.status === 401) throw new Error("Chave do OpenRouter inválida. Confira a OPENROUTER_API_KEY.");
    if (r.status === 402) throw new Error("Sem crédito no OpenRouter (ou a chave chegou no limite dela).");
    throw new Error(`OpenRouter recusou: ${String(msg).slice(0, 200)}`);
  }
  const msg = d?.choices?.[0]?.message ?? {};
  // Modelos de raciocínio podem mandar o "pensamento" entre <think>; não é para o usuário.
  const texto = String(msg.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const urls = new Set<string>();
  for (const a of msg.annotations ?? []) if (a?.url_citation?.url) urls.add(a.url_citation.url);
  for (const c of d?.citations ?? []) if (typeof c === "string") urls.add(c);
  const custo = typeof d?.usage?.cost === "number" ? d.usage.cost : null;
  return { texto: texto || "A pesquisa voltou vazia.", fontes: [...urls].slice(0, 12), custo, modelo };
}

function registrarGasto(custo: number | null, estimativa: number) {
  zerarSeMudouDia();
  gasto.total += custo ?? estimativa;
}

function formatar(r: Resultado, rotulo: string): string {
  const fontes = r.fontes.length ? `\n\nFontes:\n${r.fontes.map((u, i) => `${i + 1}. ${u}`).join("\n")}` : "\n\n(Sem fontes listadas.)";
  const custo = r.custo != null ? `US$ ${r.custo.toFixed(4)}` : "não informado";
  return `${r.texto}${fontes}\n\n— ${rotulo} · custo: ${custo}`;
}

const texto = (t: string) => ({ content: [{ type: "text" as const, text: t }] });

// ---------- Pesquisas profundas (demoram minutos: rodam em segundo plano) ----------
type Tarefa = { id: string; tema: string; estado: "pesquisando" | "pronta" | "falhou"; resultado?: string; erro?: string; inicio: number };
const tarefas = new Map<string, Tarefa>();

export function registrarFerramentas(server: McpServer) {
  server.registerTool(
    "pesquisar",
    {
      title: "Pesquisar na web",
      description:
        "Pesquisa na internet e responde com fontes (links), usando a Perplexity. Use para fatos atuais, preços, notícias, " +
        "concorrentes, tendências, documentação técnica e comparações. Níveis: rapida (padrão, centavos), completa (mais fontes e detalhes), " +
        "raciocinio (compara opções e tira conclusões). Sempre mostre as fontes ao usuário.",
      inputSchema: {
        pergunta: z.string().min(3).max(4000).describe("O que pesquisar, em linguagem natural e com detalhes (lugar, período, objetivo)"),
        nivel: z.enum(["rapida", "completa", "raciocinio"]).default("rapida"),
        contexto: z.string().max(1000).optional().describe("Para que serve a pesquisa (ex.: campanha de Meta Ads para clínica de estética em Salvador)"),
      },
      annotations: { openWorldHint: true, readOnlyHint: true },
    },
    async ({ pergunta, nivel, contexto }) => {
      const n = NIVEIS[nivel];
      const teto = conferirTeto(n.estimativa);
      if (teto) return texto(teto);
      try {
        const r = await perguntar(n.modelo, pergunta, contexto, 120_000);
        registrarGasto(r.custo, n.estimativa);
        return texto(formatar(r, n.rotulo));
      } catch (e) {
        return texto(`Não consegui pesquisar: ${(e as Error).message}`);
      }
    }
  );

  server.registerTool(
    "pesquisa_profunda",
    {
      title: "Pesquisa profunda (relatório)",
      description:
        "Faz um relatório completo sobre um tema: lê dezenas de fontes e sintetiza (Sonar Deep Research). Demora de 2 a 10 minutos " +
        "e custa cerca de US$ 0,50 a 1,00. Devolve um id na hora; depois use ver_pesquisa com esse id. Peça confirmação ao usuário antes, por causa do custo.",
      inputSchema: {
        tema: z.string().min(10).max(4000).describe("Tema e o que o relatório deve responder"),
        contexto: z.string().max(1000).optional(),
      },
      annotations: { openWorldHint: true },
    },
    async ({ tema, contexto }) => {
      const teto = conferirTeto(PROFUNDA.estimativa);
      if (teto) return texto(teto);
      const t: Tarefa = { id: randomUUID().slice(0, 8), tema, estado: "pesquisando", inicio: Date.now() };
      tarefas.set(t.id, t);
      gasto.total += PROFUNDA.estimativa; // reserva até saber o custo real
      perguntar(PROFUNDA.modelo, tema, contexto, 15 * 60_000)
        .then((r) => {
          gasto.total += (r.custo ?? PROFUNDA.estimativa) - PROFUNDA.estimativa;
          t.estado = "pronta";
          t.resultado = formatar(r, PROFUNDA.rotulo);
        })
        .catch((e) => {
          gasto.total -= PROFUNDA.estimativa;
          t.estado = "falhou";
          t.erro = (e as Error).message;
        });
      return texto(`Pesquisa profunda iniciada. Id: ${t.id}\nLeva de 2 a 10 minutos. Depois use ver_pesquisa com esse id.`);
    }
  );

  server.registerTool(
    "ver_pesquisa",
    {
      title: "Ver pesquisa profunda",
      description: "Mostra o andamento ou o relatório de uma pesquisa profunda pelo id.",
      inputSchema: { id: z.string().min(4) },
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => {
      const t = tarefas.get(id.trim());
      if (!t) return texto(`Não encontrei a pesquisa ${id}. (Pesquisas em andamento se perdem se o servidor reiniciar.)`);
      if (t.estado === "pronta") return texto(t.resultado!);
      if (t.estado === "falhou") return texto(`A pesquisa falhou: ${t.erro}`);
      const min = Math.round((Date.now() - t.inicio) / 60_000);
      return texto(`Ainda pesquisando (${min} min). Tema: ${t.tema.slice(0, 120)}`);
    }
  );

  server.registerTool(
    "gastos_pesquisa",
    {
      title: "Gastos com pesquisa",
      description: "Mostra quanto as pesquisas gastaram hoje e o teto diário.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      zerarSeMudouDia();
      return texto(`Hoje: US$ ${gasto.total.toFixed(4)} de US$ ${LIMITE_USD_DIA.toFixed(2)} de teto.`);
    }
  );
}
