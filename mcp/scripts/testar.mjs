// Teste rápido: conecta no servidor como se fosse o Claude e usa cada ferramenta.
// Uso: MCP_URL=http://127.0.0.1:3333/mcp MCP_TOKEN=sua-chave node scripts/testar.mjs

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = new URL(process.env.MCP_URL ?? "http://127.0.0.1:3333/mcp");
const token = process.env.MCP_TOKEN ?? "";

const transport = new StreamableHTTPClientTransport(url, {
  requestInit: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
});
const client = new Client({ name: "teste-estudio", version: "1.0.0" });

const mostrar = (titulo, r) => console.log(`\n=== ${titulo} ===\n${r.content.map((c) => c.text).join("\n")}`);

await client.connect(transport);

const { tools } = await client.listTools();
console.log("Ferramentas disponíveis:", tools.map((t) => t.name).join(", "));

mostrar("listar_personagens", await client.callTool({ name: "listar_personagens", arguments: {} }));

mostrar(
  "gerar_imagem",
  await client.callTool({
    name: "gerar_imagem",
    arguments: { prompt: "Segurando um sérum, fundo off-white, luz suave de estúdio", personagem: "Porta-voz 3D" },
  })
);

const video = await client.callTool({
  name: "gerar_video",
  arguments: { prompt: "Câmera aproxima devagar enquanto ela sorri", duracao: 10 },
});
mostrar("gerar_video", video);

const id = video.content[0].text.match(/Tarefa: ([0-9a-f-]+)/)?.[1];
await new Promise((r) => setTimeout(r, 4000));
mostrar("consultar_tarefa", await client.callTool({ name: "consultar_tarefa", arguments: { id } }));

mostrar("listar_galeria", await client.callTool({ name: "listar_galeria", arguments: {} }));

await client.close();
