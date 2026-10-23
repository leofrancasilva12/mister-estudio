# Mister Studio MCP

Conector do Claude para gerar **imagens, vídeos e avatares falantes** com os modelos do **Kie.ai**, direto no chat do Claude ou no Claude Code.

> O site antigo do Mister Studio foi aposentado. O código dele está guardado no ramo [`site-final`](../../tree/site-final).

## O que o Claude consegue fazer

| Ferramenta | O que faz |
|---|---|
| `gerar_imagem` | Nano Banana Pro, Nano Banana 2 ou GPT Image 2, com referências e personagens. A imagem aparece no chat. |
| `gerar_video` | Kling 3.0 ou Veo 3.1 Rápido, de texto ou animando uma imagem |
| `fazer_falar` | Foto + áudio (ex.: MP3 do ElevenLabs) vira vídeo falado (Kling Avatar) |
| `gerar_avancado` | Qualquer modelo do catálogo: Seedream, Flux, Ideogram, Seedance, Wan, Hailuo, OmniHuman, ampliar, tirar fundo, trocar pessoa no vídeo, copiar movimento, estender vídeo. Vídeo de ponta: **Gemini Omni 1.1 Flash** (também edita vídeo e usa personagens), **Kling 3.0 Omni**, **HappyHorse 1.1** e **MiniMax H3**, além de Kling 3.0, Veo 3.1 e Seedance 2.5 |
| `criar_personagem` / `listar_personagens` / `apagar_personagem` | Rostos salvos (1 a 4 fotos) para manter a mesma pessoa entre peças |
| `consultar_tarefa` | Andamento de vídeos e o link quando ficam prontos |
| `ver_creditos` | Saldo do Kie.ai e o gasto do dia |
| `gerar_voz` / `gerar_dialogo` | Narração e diálogo ElevenLabs (opcional) |

Teto diário de créditos: `MCP_LIMITE_CREDITOS_DIA` (padrão 600).

## Mister Pesquisa MCP (pasta `pesquisa/`)

Pesquisa na web com fontes, usando os modelos Sonar da Perplexity pelo OpenRouter. Endereço: `https://SEU_DOMINIO/pesquisa/mcp` (cabeçalho `Authorization: Bearer PESQUISA_TOKEN`).

| Ferramenta | O que faz |
|---|---|
| `pesquisar` | Responde com fontes. Níveis: `rapida` (sonar), `completa` (sonar-pro), `raciocinio` (sonar-reasoning-pro) |
| `pesquisa_profunda` / `ver_pesquisa` | Relatório completo (sonar-deep-research), em segundo plano, de 2 a 10 min |
| `gastos_pesquisa` | Gasto do dia e teto (`PESQUISA_LIMITE_USD_DIA`, padrão US$ 2) |
| `ultimas_noticias` | Últimas notícias por RSS (g1 por editoria ou qualquer feed https). Grátis |

## Mister Video MCP (pasta `video/`)

Transcreve vídeos do YouTube pela legenda (manual ou automática). Grátis, sem chave de API. Endereço: `https://SEU_DOMINIO/video/mcp` (cabeçalho `Authorization: Bearer VIDEO_TOKEN` ou a chave no fim do endereço: `/video/mcp/VIDEO_TOKEN`).

| Ferramenta | O que faz |
|---|---|
| `transcrever_youtube` | Transcrição com horário (blocos de 30 s) ou texto corrido. Escolhe o idioma (`pt`, `en`...), aceita `inicio_segundos` para vídeos longos e `max_caracteres` |
| `info_youtube` | Título, canal, duração, descrição e idiomas de legenda disponíveis |

Limites: só lê o que é falado (não vê imagens) e só funciona em vídeos com legenda. O YouTube pode bloquear servidores de nuvem de vez em quando; nesse caso a ferramenta avisa em português.

## Estrutura

| Caminho | Para que serve |
|---|---|
| `mcp/src/index.ts` | Liga o servidor (HTTP na VPS ou stdio no computador) e confere a chave |
| `mcp/src/ferramentas.ts` | As ferramentas que o Claude enxerga |
| `mcp/src/catalogo.js` | Como montar o pedido de cada modelo do Kie.ai |
| `mcp/src/provedores/kie.ts` | Conversa com a API do Kie.ai |
| `mcp/src/galeria.ts` | Personagens salvos em `/dados` (volume do Docker) |
| `docker-compose.yml`, `Caddyfile` | MCP + HTTPS na VPS |

## Subir na VPS

```bash
git clone https://github.com/leofrancasilva12/mister-estudio.git estudio && cd estudio
cp .env.example .env && nano .env && chmod 600 .env
docker compose up -d --build
curl -s https://SEU_DOMINIO/mcp-saude      # {"ok":true,"provedor":"kie"}
```

## Conectar

**Chat do Claude:** Configurações → Conectores → Adicionar conector personalizado.
URL `https://SEU_DOMINIO/mcp`, "Sem login", e em Cabeçalhos: `Authorization` = `Bearer SUA_MCP_TOKEN`.

**Claude Code:**
```bash
claude mcp add --transport http studio https://SEU_DOMINIO/mcp --header "Authorization: Bearer SUA_MCP_TOKEN"
```

## Segurança
- A chave do Kie.ai fica só no `.env` da VPS; o Claude nunca a vê.
- Sem `MCP_TOKEN`, o servidor não abre para a rede.
- Só `/mcp` é exposto pelo Caddy; o resto responde 404.
