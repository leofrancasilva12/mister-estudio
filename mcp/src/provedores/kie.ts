import type { PedidoGeracao, Provedor, Tarefa } from "./tipos.js";

// Provedor de verdade: usa a API do Kie.ai, com os mesmos modelos do site do Estúdio.
// A chave fica só no servidor (variável KIE_API_KEY), nunca vai para o Claude.

const API = process.env.KIE_API_BASE ?? "https://api.kie.ai";

const MENSAGENS: Record<number, string> = {
  401: "Chave do Kie.ai inválida. Confira a KIE_API_KEY no .env da VPS.",
  402: "Acabaram os créditos do Kie.ai. Recarregue no painel do Kie.ai.",
  422: "O Kie.ai recusou as opções enviadas.",
  429: "Muitos pedidos seguidos. Espere alguns segundos.",
  433: "Limite de uso do Kie.ai atingido.",
  455: "O Kie.ai está em manutenção.",
  500: "O Kie.ai teve um erro interno. Tente de novo.",
  501: "A geração falhou no Kie.ai.",
};

export const MODELOS_IMAGEM = ["nano-banana-pro", "nano-banana-2", "gpt-image-2"] as const;
export const MODELOS_VIDEO = ["kling-3", "veo-3-1-rapido"] as const;

// Estimativa em créditos (o valor real vem do Kie.ai depois)
export function estimarCreditos(p: PedidoGeracao): number {
  const q = p.qualidade ?? "1K";
  if (p.tipo === "imagem") {
    if (p.modelo === "nano-banana-2") return ({ "1K": 8, "2K": 12, "4K": 18 } as Record<string, number>)[q] ?? 12;
    if (p.modelo === "gpt-image-2") return ({ "1K": 6, "2K": 10, "4K": 16 } as Record<string, number>)[q] ?? 6;
    return q === "4K" ? 24 : 18;
  }
  if (p.modelo === "veo-3-1-rapido") return 60;
  return 14 * (p.duracaoSegundos ?? 5);
}

function chave(): string {
  const k = process.env.KIE_API_KEY;
  if (!k) throw new Error("Falta a KIE_API_KEY no servidor do MCP.");
  return k;
}

async function chamar(caminho: string, corpo?: unknown): Promise<any> {
  let resposta: globalThis.Response;
  try {
    resposta = await fetch(API + caminho, {
      method: corpo ? "POST" : "GET",
      headers: { Authorization: `Bearer ${chave()}`, ...(corpo ? { "Content-Type": "application/json" } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: AbortSignal.timeout(60_000),
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("KIE_API_KEY")) throw e;
    throw new Error("Não consegui falar com o Kie.ai. Tente de novo em instantes.");
  }
  const dados: any = await resposta.json().catch(() => null);
  const codigo = dados?.code ?? resposta.status;
  if (codigo !== 200) {
    const detalhe = codigo === 422 && dados?.msg ? ` (${String(dados.msg).slice(0, 160)})` : "";
    throw new Error((MENSAGENS[codigo] ?? `O Kie.ai respondeu com erro ${codigo}.`) + detalhe);
  }
  return dados.data;
}

// Monta o pedido no formato de cada modelo do Kie.ai
function montar(p: PedidoGeracao): { model: string; input: Record<string, unknown> } {
  const refs = (p.referencias ?? []).filter((u) => /^https:\/\//.test(u));
  if (p.tipo === "imagem") {
    const resolution = p.qualidade ?? (p.modelo === "nano-banana-pro" || !p.modelo ? "2K" : "1K");
    if (p.modelo === "gpt-image-2") {
      const input: Record<string, unknown> = { prompt: p.prompt, aspect_ratio: p.formato, resolution: resolution === "2K" && ["4:5"].includes(p.formato) ? "1K" : resolution };
      if (refs.length) input.input_urls = refs.slice(0, 16);
      return { model: refs.length ? "gpt-image-2-image-to-image" : "gpt-image-2-text-to-image", input };
    }
    if (p.modelo === "nano-banana-2" && !refs.length) {
      return { model: "nano-banana-2", input: { prompt: p.prompt, aspect_ratio: p.formato, resolution, output_format: "png" } };
    }
    const input: Record<string, unknown> = { prompt: p.prompt, aspect_ratio: p.formato, resolution, output_format: "png" };
    if (refs.length) input.image_input = refs.slice(0, 8);
    return { model: "nano-banana-pro", input };
  }
  const formato = p.formato === "4:5" ? "9:16" : p.formato;
  const inicial = p.imagemInicial && /^https:\/\//.test(p.imagemInicial) ? p.imagemInicial : undefined;
  if (p.modelo === "veo-3-1-rapido") {
    const duracoes = [4, 6, 8];
    const duration = duracoes.reduce((a, b) => (Math.abs(b - (p.duracaoSegundos ?? 8)) < Math.abs(a - (p.duracaoSegundos ?? 8)) ? b : a));
    const input: Record<string, unknown> = {
      prompt: p.prompt, model: "veo3_fast", aspect_ratio: formato === "1:1" ? "16:9" : formato, resolution: "720p", duration, enable_translation: true,
      generation_type: inicial ? "FIRST_AND_LAST_FRAMES_2_VIDEO" : "TEXT_2_VIDEO",
    };
    if (inicial) input.image_urls = [inicial];
    return { model: "veo-3-1", input };
  }
  const input: Record<string, unknown> = {
    prompt: p.prompt, sound: false, duration: String(Math.min(15, Math.max(3, p.duracaoSegundos ?? 5))), mode: "std", multi_shots: false,
  };
  if (inicial) input.image_urls = [inicial];
  else input.aspect_ratio = formato;
  return { model: "kling-3.0/video", input };
}

function extrairUrls(data: any): string[] {
  let r: any = {};
  try { r = typeof data.resultJson === "string" ? JSON.parse(data.resultJson || "{}") : data.resultJson ?? {}; } catch { /* resultado estranho */ }
  const candidatos = [r.resultUrls, r.result_urls, r.data?.result_urls, r.data?.resultUrls, r.origin_urls, data.origin_urls, r.resultUrl && [r.resultUrl]];
  const achado = candidatos.find((c) => Array.isArray(c) && c.length);
  return (achado ?? []).filter((u: unknown) => typeof u === "string");
}

export async function consultarSaldo(): Promise<number> {
  return Number(await chamar("/api/v1/chat/credit"));
}

export function criarProvedorKie(): Provedor {
  const tarefas = new Map<string, Tarefa>();
  return {
    nome: "kie",
    async iniciar(pedido) {
      const corpo = montar(pedido);
      const data = await chamar("/api/v1/jobs/createTask", corpo);
      if (!data?.taskId) throw new Error("O Kie.ai não devolveu o número da tarefa.");
      const tarefa: Tarefa = { id: data.taskId, pedido, situacao: "na_fila", progresso: 0, modeloKie: corpo.model, criadaEm: new Date().toISOString() };
      tarefas.set(tarefa.id, tarefa);
      return { ...tarefa };
    },
    async consultar(id) {
      const conhecida = tarefas.get(id);
      if (conhecida && (conhecida.situacao === "pronta" || conhecida.situacao === "falhou")) return { ...conhecida };
      let data: any;
      try { data = await chamar(`/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(id)}`); } catch (e) {
        if (!conhecida) return undefined;
        throw e;
      }
      const tarefa: Tarefa = conhecida ?? { id, pedido: { tipo: "imagem", prompt: "", formato: "1:1" }, situacao: "gerando", progresso: 0, criadaEm: new Date().toISOString() };
      if (data?.state === "success") {
        const urls = extrairUrls(data);
        if (urls.length) {
          tarefa.situacao = "pronta"; tarefa.progresso = 100; tarefa.resultadoUrl = urls[0];
          const c = Number(data.creditsConsumed);
          if (Number.isFinite(c) && c > 0) tarefa.creditos = c;
        } else {
          tarefa.situacao = "falhou"; tarefa.erro = "O Kie.ai terminou, mas não mandou o arquivo.";
        }
      } else if (data?.state === "fail") {
        tarefa.situacao = "falhou"; tarefa.erro = data.failMsg ? String(data.failMsg).slice(0, 200) : "A geração falhou no Kie.ai.";
      } else {
        tarefa.situacao = data?.state === "waiting" ? "na_fila" : "gerando";
        tarefa.progresso = typeof data?.progress === "number" ? data.progress : tarefa.progresso;
      }
      tarefas.set(id, tarefa);
      return { ...tarefa };
    },
  };
}
