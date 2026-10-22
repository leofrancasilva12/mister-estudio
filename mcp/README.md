# Estúdio MCP

Servidor MCP do Estúdio: deixa o Claude (e qualquer agente com MCP) **gerar imagens e vídeos com IA** e guardar tudo numa galeria.

> **Etapa 2 de 3.** Gera de verdade pelo **Kie.ai** (Nano Banana Pro, Nano Banana 2, GPT Image 2, Kling 3.0, Veo 3.1 Rápido, vozes e diálogos ElevenLabs e Kling Avatar para fazer falar). A imagem aparece direto no chat. Há um teto diário de créditos (`MCP_LIMITE_CREDITOS_DIA`, padrão 600).
> **Etapa 3:** gravar a galeria no **Supabase**, compartilhada com o app.

---

## O que tem aqui dentro

| Arquivo | Para que serve |
|---|---|
| `src/index.ts` | A recepção: liga o servidor, confere a senha e escolhe o modo (`http` ou `stdio`) |
| `src/ferramentas.ts` | O cardápio do Claude: as 5 ferramentas |
| `src/galeria.ts` | Guarda o que ficou pronto e os personagens salvos |
| `src/provedores/tipos.ts` | O "contrato" que todo provedor de IA segue |
| `src/provedores/simulado.ts` | O gerador de mentira, para testes |
| `src/config.ts` | Lê as configurações do `.env` |
| `scripts/testar.mjs` | Testa todas as ferramentas como se fosse o Claude |
| `Dockerfile`, `docker-compose.yml`, `Caddyfile` | Para subir na VPS com HTTPS |

## As ferramentas

| Ferramenta | O que faz |
|---|---|
| `gerar_imagem` | Gera uma imagem e espera até 25 s para devolver o link pronto |
| `gerar_video` | Inicia um vídeo e devolve o número da tarefa na hora |
| `consultar_tarefa` | Mostra o andamento e, quando pronto, o link |
| `listar_galeria` | Lista o que já foi gerado |
| `listar_personagens` | Lista os personagens salvos (ex.: Porta-voz 3D) |

---

## 1. Rodar no seu computador

Precisa do **Node.js 22** ou mais novo.

```bash
npm install
npm run build
MCP_TOKEN=uma-chave-qualquer npm start
```

No Windows (PowerShell):

```powershell
npm install
npm run build
$env:MCP_TOKEN="uma-chave-qualquer"; npm start
```

O servidor fica em `http://127.0.0.1:3333/mcp`. Em outro terminal, teste tudo:

```bash
MCP_TOKEN=uma-chave-qualquer node scripts/testar.mjs
```

Você também pode explorar as ferramentas na mão com o inspetor oficial: `npm run inspector`.

## 2. Usar no Claude Desktop (modo local)

Depois do `npm run build`, adicione ao arquivo de configuração do Claude Desktop (`claude_desktop_config.json`), trocando o caminho pelo da sua pasta:

```json
{
  "mcpServers": {
    "estudio": {
      "command": "node",
      "args": ["C:\\caminho\\para\\estudio-mcp\\dist\\index.js"],
      "env": { "MODO": "stdio" }
    }
  }
}
```

Reinicie o Claude Desktop. Funciona só no Desktop e no Claude Code.

## 3. Subir na VPS (para usar no chat e no celular)

1. **DNS:** crie um registro do tipo A, por exemplo `mcp.seudominio.com.br`, apontando para o IP da VPS.
2. **Envie esta pasta** para a VPS (ou para um repositório no GitHub e clone lá).
3. **Crie o `.env`:**
   ```bash
   cp .env.example .env
   nano .env
   ```
   Preencha o domínio e gere uma chave longa com `openssl rand -hex 32`.
4. **Suba:**
   ```bash
   docker compose up -d --build
   ```
5. **Confira:** abra `https://mcp.seudominio.com.br/saude`. Deve aparecer `{"ok":true,...}`.

> **Atenção:** este `docker-compose.yml` traz um Caddy próprio, usando as portas 80 e 443. Se a VPS já tiver outro Caddy ou servidor web nessas portas, remova o serviço `caddy` daqui e adicione o bloco do `Caddyfile` ao proxy que já existe.

## 4. Conectar aqui no Claude

1. No Claude, vá em **Personalizar → Conectores → Adicionar → Adicionar conector personalizado**.
2. **Nome:** Estúdio. **URL:** `https://mcp.seudominio.com.br/mcp`.
3. Em **Request headers**, adicione:
   - Nome: `Authorization`
   - Valor: `Bearer SUA_CHAVE_DO_.ENV`
4. Salve. Numa conversa, ative o conector pelo botão **+ → Conectores** e peça, por exemplo:
   *"Gera a Porta-voz 3D segurando um sérum, fundo off-white, formato 4:5."*

## Segurança

- Sem `MCP_TOKEN`, o servidor **se recusa** a abrir para a rede.
- A porta 3333 nunca fica exposta: só o Caddy fala com ela, pela rede interna do Docker.
- `HOSTS_PERMITIDOS` faz o servidor recusar pedidos que cheguem por outro endereço.
- Nunca envie o arquivo `.env` para o GitHub (ele já está no `.gitignore`).
