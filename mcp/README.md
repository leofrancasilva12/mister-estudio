# mcp/ — código do Mister Studio MCP

Instruções de uso, VPS e conexão: veja o [README da raiz](../README.md).

## Rodar no computador (para testar)
```bash
npm install && npm run build
PROVEDOR=simulado MCP_TOKEN=teste DADOS_DIR=./dados npm start     # http://127.0.0.1:3333/mcp
```
Modo stdio (Claude Code local, sem VPS):
```bash
claude mcp add kie --env MODO=stdio --env PROVEDOR=kie --env KIE_API_KEY=SUA_CHAVE --env DADOS_DIR=/caminho/dados -- node /caminho/mcp/dist/index.js
```
