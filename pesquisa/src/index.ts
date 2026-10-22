import { timingSafeEqual } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { hostHeaderValidation, localhostHostValidation } from "@modelcontextprotocol/sdk/server/middleware/hostHeaderValidation.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registrarFerramentas } from "./pesquisa.js";

// Mister Pesquisa MCP: atende em /pesquisa/mcp, atrás do Caddy, com chave própria.

const PORTA = Number(process.env.PORTA ?? 3334);
const HOST = process.env.HOST ?? "127.0.0.1";
const TOKEN = process.env.PESQUISA_TOKEN ?? "";
const HOSTS = (process.env.HOSTS_PERMITIDOS ?? "").split(",").map((h) => h.trim()).filter(Boolean);

const local = ["127.0.0.1", "localhost", "::1"].includes(HOST);
if (!TOKEN && !local) {
  console.error("Defina PESQUISA_TOKEN antes de abrir o servidor para a rede.");
  process.exit(1);
}

function exigirToken(req: Request, res: Response, next: NextFunction) {
  const recebido = (req.header("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(recebido);
  const b = Buffer.from(TOKEN);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(401).json({ erro: "Acesso negado" });
    return;
  }
  next();
}

const app = express();
if (HOSTS.length) app.use(hostHeaderValidation(HOSTS));
else if (local) app.use(localhostHostValidation());
app.use(express.json({ limit: "1mb" }));

app.get(["/saude", "/pesquisa/saude"], (_req, res) => {
  res.json({ ok: true, servico: "pesquisa", openrouter: !!process.env.OPENROUTER_API_KEY });
});

const protecao = TOKEN ? [exigirToken] : [];

app.post("/pesquisa/mcp", ...protecao, async (req: Request, res: Response) => {
  const server = new McpServer({ name: "pesquisa", version: "1.0.0" });
  registrarFerramentas(server);
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
    if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Erro interno" }, id: null });
  }
});

const naoPermitido = (_req: Request, res: Response) => {
  res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Método não permitido" }, id: null });
};
app.get("/pesquisa/mcp", ...protecao, naoPermitido);
app.delete("/pesquisa/mcp", ...protecao, naoPermitido);

app.listen(PORTA, HOST, () => console.log(`Mister Pesquisa MCP em http://${HOST}:${PORTA}/pesquisa/mcp`));
