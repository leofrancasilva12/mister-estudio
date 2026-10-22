import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "./config.js";
import { registrarFerramentas } from "./ferramentas.js";
import { criarProvedorSimulado } from "./provedores/simulado.js";
import { criarProvedorKie } from "./provedores/kie.js";
import type { Provedor } from "./provedores/tipos.js";

// Ponto de partida: escolhe o provedor, monta o servidor e liga no modo certo.

function escolherProvedor(): Provedor {
  if (config.provedor === "kie") {
    if (!process.env.KIE_API_KEY) throw new Error("PROVEDOR=kie precisa da KIE_API_KEY.");
    return criarProvedorKie();
  }
  return criarProvedorSimulado(config.segundosSimulados);
}

// Um único provedor para o servidor inteiro, para as tarefas não se perderem entre pedidos.
const provedor = escolherProvedor();

function criarServidor(): McpServer {
  const server = new McpServer({ name: "estudio", version: "0.2.0" });
  registrarFerramentas(server, provedor);
  return server;
}

// Porteiro: só deixa passar quem envia a chave certa, no cabeçalho Authorization
// ou no fim do endereço (/mcp/CHAVE), que é o jeito mais simples de conectar no Claude.
function exigirToken(req: Request, res: Response, next: NextFunction) {
  const doCabecalho = (req.header("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const recebido = doCabecalho || String(req.params?.chave ?? "");
  const a = Buffer.from(recebido);
  const b = Buffer.from(config.tokenAcesso);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(401).json({ erro: "Acesso negado" });
    return;
  }
  next();
}

async function iniciarHttp() {
  const local = ["127.0.0.1", "localhost", "::1"].includes(config.host);
  if (!config.tokenAcesso && !local) {
    throw new Error("Defina MCP_TOKEN antes de abrir o servidor para a rede.");
  }

  const app = createMcpExpressApp({
    host: config.host,
    allowedHosts: config.hostsPermitidos.length ? config.hostsPermitidos : undefined,
  });

  // Rota de saúde, para o Docker e o Caddy saberem que o servidor está vivo.
  app.get(["/saude", "/mcp-saude"], (_req, res) => {
    res.json({ ok: true, provedor: provedor.nome });
  });

  const protecao = config.tokenAcesso ? [exigirToken] : [];

  // Modo "sem sessão": cada pedido do Claude cria um servidor novo e descartável.
  // É o formato mais simples e robusto para rodar atrás de um proxy.
  app.post(["/mcp", "/mcp/:chave"], ...protecao, async (req: Request, res: Response) => {
    const server = criarServidor();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (erro) {
      console.error("Erro ao atender pedido MCP:", erro);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Erro interno" }, id: null });
      }
    }
  });

  // No modo sem sessão não existem conexões abertas para consultar ou encerrar.
  const naoPermitido = (_req: Request, res: Response) => {
    res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Método não permitido" }, id: null });
  };
  app.get(["/mcp", "/mcp/:chave"], ...protecao, naoPermitido);
  app.delete(["/mcp", "/mcp/:chave"], ...protecao, naoPermitido);

  app.listen(config.porta, config.host, () => {
    console.log(`Estúdio MCP no ar em http://${config.host}:${config.porta}/mcp (provedor: ${provedor.nome})`);
  });
}

async function iniciarStdio() {
  const server = criarServidor();
  await server.connect(new StdioServerTransport());
  // No modo stdio a saída padrão é do protocolo, então os avisos vão para stderr.
  console.error(`Estúdio MCP no modo stdio (provedor: ${provedor.nome})`);
}

(config.modo === "stdio" ? iniciarStdio() : iniciarHttp()).catch((erro) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
