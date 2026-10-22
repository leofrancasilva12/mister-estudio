# Estúdio do Mister

O Open-Higgsfield (licença MIT) adaptado para o **Kie.ai**, com a chave da API **escondida no servidor**.

Antes, o navegador falava direto com a API e a chave ficava guardada no celular de quem usava. Agora funciona assim:

```
Celular  ──(usuário e senha)──>  Caddy (HTTPS)  ──>  Estúdio (Next.js)  ──(chave secreta)──>  Kie.ai
```

O navegador só conversa com o nosso servidor. A chave do Kie.ai nunca sai da VPS.

## O que mudou em relação ao original

| Arquivo | O que faz |
|---|---|
| `packages/studio/src/models.js` | A lista de modelos do Kie.ai que aparece na tela |
| `packages/studio/src/api.js` | Substitui o `muapi.js`: as telas pedem ao nosso servidor, não à API |
| `lib/kie/catalogo.js` | O tradutor: converte cada pedido no formato exato do Kie.ai e recusa modelos fora da lista |
| `lib/kie/cliente.js` | O único lugar que usa a chave: cria tarefas, acompanha, envia arquivos e lê os créditos |
| `app/api/estudio/*` | As portas do servidor: `gerar`, `tarefa`, `upload`, `creditos` |
| `components/StandaloneShell.js` | Sem a tela de digitar a chave; mostra os créditos no topo |

## Modelos

- **Imagem:** Nano Banana 2, Seedream 4.5, Flux 2 Pro, GPT Image 1.5. Os quatro também editam a partir de imagens de referência.
- **Vídeo:** Seedance 2 e Kling 2.6, a partir de texto ou de imagem, e Hailuo 2.3, a partir de imagem. Dá para ligar ou desligar o áudio.
- **Lip Sync:** InfiniteTalk e Kling Avatar, que fazem um retrato falar, e Lip Sync de vídeo, que troca a fala de um vídeo.
- **Cinema:** usa o Nano Banana 2 com os presets de câmera e lente.

Para adicionar um modelo, coloque-o em `models.js` (tela) e em `lib/kie/catalogo.js` (servidor), com o mesmo `id`.

---

## Subir na VPS, passo a passo

Os comandos abaixo rodam na VPS, logado como `leo` no Termius.

### 1. Trazer o código

```bash
cd ~
git clone https://github.com/leofrancasilva12/mister-estudio.git estudio
cd estudio
```

### 2. Criar a senha da tela

Troque `SUA_SENHA` por uma senha forte:

```bash
docker run --rm caddy:2-alpine caddy hash-password --plaintext 'SUA_SENHA'
```

Ele devolve um texto que começa com `$2a$14$...`. Copie esse texto, que é o hash da senha.

### 3. Preencher as configurações

```bash
cp .env.example .env
nano .env
```

- `KIE_API_KEY`: a sua chave do Kie.ai.
- `ESTUDIO_SENHA_HASH`: cole o hash **entre aspas simples**, assim: `'$2a$14$...'`. Sem as aspas o Docker estraga o texto.
- Deixe `KIE_SIMULADO=true` no primeiro teste.

Para salvar no nano: `Ctrl+O`, `Enter` e depois `Ctrl+X`.

### 4. Ligar

```bash
docker compose up -d --build
```

A primeira vez demora de 3 a 6 minutos, porque ele monta o app. Para acompanhar:

```bash
docker compose logs -f
```

Para sair dos logs: `Ctrl+C`. O app continua rodando.

### 5. Testar

1. Abra `https://srv2085023.hstgr.cloud/api/saude`. Deve aparecer `{"ok":true,"modo":"simulado"}`.
2. Abra `https://srv2085023.hstgr.cloud`, entre com `leo` e a sua senha e gere uma imagem. No modo simulado aparece uma imagem de exemplo e nenhum crédito é gasto.

### 6. Ligar o Kie.ai de verdade

```bash
nano .env                  # troque para KIE_SIMULADO=false
docker compose up -d       # reinicia com a nova configuração
```

## Comandos do dia a dia

| Quero... | Comando |
|---|---|
| Ver se está rodando | `docker compose ps` |
| Ver os logs | `docker compose logs -f estudio` |
| Reiniciar | `docker compose restart` |
| Atualizar o código | `git pull && docker compose up -d --build` |
| Desligar | `docker compose down` |

## Segurança

- A chave do Kie.ai fica só no `.env` da VPS. O `.env` está no `.gitignore` e nunca vai para o GitHub.
- Tudo exige usuário e senha, menos `/api/saude`.
- O app não abre porta própria. Só o Caddy, nas portas 80 e 443, fala com ele.
- O servidor só aceita os modelos da lista e confere as opções antes de gastar créditos.
- O Kie.ai apaga os arquivos gerados depois de alguns dias. Baixe o que quiser guardar. A galeria permanente vem com o Supabase.

> **Próximos apps na mesma VPS:** este Caddy ocupa as portas 80 e 443. Quando subirmos o próximo app (Pesquisa, MCP...), transformamos este Caddy na "portaria" de todos, cada um no seu endereço.

## Créditos

Baseado no [Open-Higgsfield-AI](https://github.com/Anil-matcha/Open-Higgsfield-AI), de Anil Matcha, sob licença MIT. As telas originais foram mantidas; o motor foi trocado para o Kie.ai.
