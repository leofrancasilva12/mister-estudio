# Estúdio do Mister

O Open-Higgsfield (licença MIT) adaptado para o **Kie.ai**, com a chave da API **escondida no servidor**.

Antes, o navegador falava direto com a API e a chave ficava guardada no celular de quem usava. Agora funciona assim:

```
Celular  ──(usuário e senha)──>  Caddy (HTTPS)  ──>  Estúdio (Next.js)  ──(chave secreta)──>  Kie.ai
```

O navegador só conversa com o nosso servidor. A chave do Kie.ai nunca sai da VPS.

## Como o projeto está organizado

| Pasta / arquivo | O que faz |
|---|---|
| `app/` | As telas: Explorar (`/`), Imagem, Vídeo, Lip Sync, Cinema e Biblioteca |
| `app/api/estudio/*` | As portas do servidor: `gerar`, `tarefa`, `upload`, `creditos` |
| `components/` | Peças do visual: cabeçalho, painel de criação, feed, visualizador e controles |
| `lib/modelos.js` | Os modelos e opções que aparecem na tela |
| `lib/historico.js` | Guarda as gerações neste aparelho e acompanha as que estão em andamento |
| `lib/kie/catalogo.js` | O tradutor: converte cada pedido no formato exato do Kie.ai e recusa modelos fora da lista |
| `lib/kie/cliente.js` | O único lugar que usa a chave: cria tarefas, acompanha, envia arquivos e lê os créditos |

Visual: branco, traços finos, fonte Geist. No computador, painel de criação à esquerda e feed à direita; no celular, feed em tela cheia, barra de criação embaixo e ajustes numa gaveta.

## O que dá para fazer

- **Imagem:** Nano Banana Pro, Nano Banana 2, Seedream 5.0 Pro, GPT Image 2, Ideogram V3, Seedream 4.5 e Flux 2 Pro. Criar do zero ou editar com até 16 imagens anexadas.
- **Vídeo:** Kling 3.0, Veo 3.1, Seedance 2.5, Seedance 2, Wan 3.0 e Hailuo 2.3. A partir de texto, de quadro inicial e final, ou de várias imagens de referência.
- **Lip Sync:** Kling Avatar, InfiniteTalk e troca de fala em vídeo.
- **Áudio:** voz em português com ElevenLabs Multilingual v2.
- **Cinema:** presets de câmera, lente, distância focal e abertura.
- **Ferramentas:** ampliar imagem (Topaz), ampliar com nitidez (Recraft), remover fundo (Recraft) e ampliar vídeo (Topaz).
- No celular, o botão **+** da barra anexa fotos; no computador, dá para arrastar ou colar (Ctrl+V).

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
- Tudo exige login pela tela do app, menos `/api/saude`. O botão **Sair** fica no menu da bolinha do topo (no celular, em **Mais**).
- Depois de 5 senhas erradas seguidas, o login trava por 5 minutos.
- O app não abre porta própria. Só o Caddy, nas portas 80 e 443, fala com ele.
- O servidor só aceita os modelos da lista e confere as opções antes de gastar créditos.
- O Kie.ai apaga os arquivos gerados depois de alguns dias. Baixe o que quiser guardar. A galeria permanente vem com o Supabase.

> **Próximos apps na mesma VPS:** este Caddy ocupa as portas 80 e 443. Quando subirmos o próximo app (Pesquisa, MCP...), transformamos este Caddy na "portaria" de todos, cada um no seu endereço.

## Créditos

Baseado no [Open-Higgsfield-AI](https://github.com/Anil-matcha/Open-Higgsfield-AI), de Anil Matcha, sob licença MIT. O motor foi trocado para o Kie.ai e as telas foram redesenhadas no visual do Mister.
