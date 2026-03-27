# Guia de Deploy no Render.com (Web Service)

Este guia acompanha passo-a-passo como fazer o deploy do **Middleware Chatwoot (Node.js/Fastify)** na plataforma [Render.com](https://render.com).

## 1. Preparação (Github)
Certifique-se de que o código deste projeto foi comitado e enviado para um repositório no GitHub (ex: `almeida-atendimento-inteligente`).

## 2. Criando o Web Service no Render
1. Acesse o seu painel do Render e clique em **New +** no canto superior direito.
2. Selecione **Web Service**.
3. Conecte sua conta do GitHub e selecione o repositório `almeida-atendimento-inteligente`.

## 3. Configuração do Serviço
Preencha as configurações do serviço da seguinte maneira:

- **Name:** `almeida-chatwoot-middleware` (ou um nome de sua preferência)
- **Language / Environment:** `Node`
- **Branch:** `main` (ou a branch principal que estiver usando)
- **Root Directory:** Deixe em branco (ou coloque `.` caso o repositório seja apenas este middleware)
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start` (Isso executa `node dist/index.js` no Fastify)

## 4. Variáveis de Ambiente (Environment Variables)
Nessa mesma tela, role para baixo até a seção **Advanced** e clique em **Add Environment Variable**. Adicione as seguintes chaves e valores:

| Key | Value | Descrição |
| :--- | :--- | :--- |
| `PORT` | `10000` | O Render usa a porta 10000 por padrão, e nosso Fastify a lerá via `process.env.PORT`. |
| `CHATWOOT_URL` | *Sua URL* | URL base do seu servidor Chatwoot (ex: `https://chatwoot.almeida.com.br`) |
| `CHATWOOT_API_TOKEN`| *Seu Token* | Seu token de acesso à API do Chatwoot (Profile > Access Tokens) |
| `CHATWOOT_ACCOUNT_ID`| `1` | O ID da conta instanciada (Geralmente 1 se for o principal) |

## 5. Finalizando o Deploy
- Role até o final da página e clique em **Create Web Service**.
- O Render iniciará o processo de clonagem, build (compilação do TypeScript para JavaScript) e deploy.
- Aguarde até que os logs mostrem `Server is running at http://localhost:10000` e a flag do serviço fique **Live (Verde)**.

## 6. Configurando o Webhook no Chatwoot
1. Acesse seu painel administrativo do Chatwoot.
2. Vá em **Configurações > Webhooks**.
3. Clique em **Adicionar Webhook**.
4. No campo **URL**, cole a URL pública gerada pelo Render (ex: `https://almeida-chatwoot-middleware.onrender.com/webhook/chatwoot`).
5. Nos Eventos (Subscriptions), selecione **Message Created** (Mensagem Criada).
6. Salve. A partir de agora, toda mensagem nova será interceptada e processada (com lógica de loop e handoff) corretamente por este middleware.
