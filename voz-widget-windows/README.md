# Widget de Voz — Master Controller (Windows)

Widget flutuante (Electron) que grava um comando por voz, transcreve com o
Google Cloud Speech-to-Text, envia o texto para o Master Controller via
webhook HTTP e pode responder por voz (Google Cloud Text-to-Speech) ou por
texto. É a "porta de entrada" descrita na especificação do projeto — toda a
inteligência de classificação/roteamento fica no Master Controller, não aqui.

## Pré-requisitos (uma vez só)

1. **Node.js** instalado no Windows.
2. **Autenticação Google Cloud sem chave JSON** (política do Workspace
   bloqueia a criação de chaves de service account):
   ```
   gcloud auth application-default login
   ```
   Isso grava as credenciais em
   `%APPDATA%\gcloud\application_default_credentials.json`, que as
   bibliotecas oficiais do Google usam automaticamente — não é preciso (nem
   é possível) configurar nada disso no `.env` deste projeto.
3. Habilitar no projeto do Google Cloud (`mastercontroller-506920` ou o que
   estiver em uso):
   - `speech.googleapis.com` (Speech-to-Text)
   - `texttospeech.googleapis.com` (Text-to-Speech)
4. Se aparecer erro de permissão/escopo ao transcrever, defina o projeto de
   cota da ADC e refaça o login com escopo completo:
   ```
   gcloud auth application-default set-quota-project SEU_PROJECT_ID
   gcloud auth application-default login --scopes=https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/userinfo.email
   ```

## Configuração

```
cd voz-widget-windows
copy .env.example .env
```

Edite `.env`:

- `MASTER_CONTROLLER_URL` — URL local do Master Controller que vai receber o
  texto transcrito (ex: `http://localhost:5005/entrada`). Enquanto o Master
  Controller ainda não existir, deixe em branco: o widget continua
  funcionando (grava, transcreve, mostra o texto na tela), só não consegue
  entregar o comando — o erro aparece na tela e fica registrado em
  `voz-widget-windows/logs/`.
- Demais variáveis (`STT_LANGUAGE_CODE`, `TTS_LANGUAGE_CODE`,
  `TTS_VOICE_NAME`, `GOOGLE_CLOUD_PROJECT`) já vêm com padrão em pt-BR; só
  mude se quiser outro idioma/voz ou apontar explicitamente o projeto GCP.

## Rodando

```
npm install
npm start
```

Um widget transparente "de cristal" aparece no canto superior direito da
tela principal, e um ícone some na bandeja do sistema.

- **Clique em "Voz"** para começar a gravar; clique de novo para parar.
- **`Ctrl+Alt+M`** mostra/esconde o widget de qualquer lugar do Windows.
- **Ícone da bandeja** → Mostrar/Ocultar ou Sair (fechar a janela com X só
  esconde; "Sair" é que encerra o processo de verdade).
- **Toggle "Falada" / "Escrita"** controla se a resposta do Master
  Controller é falada (Text-to-Speech) ou só exibida como texto.
- **Botão "Tela"** aparece esmaecido/"Em breve" nesta versão — captura de
  conteúdo de tela no Windows (equivalente ao que o TalkBack faz no
  Android) ainda não foi implementada; fica para uma fase futura.

## O que acontece quando algo falha

Nada falha em silêncio — toda falha aparece na tela e é gravada em
`voz-widget-windows/logs/`:

- Permissão de microfone negada → aviso na tela.
- Erro na transcrição (Speech-to-Text) → aviso na tela.
- Master Controller fora do ar / não configurado / demorou para responder →
  aviso na tela, mas o texto transcrito continua visível e selecionável
  no cartão de resposta (para copiar/reenviar manualmente).
- Erro ao gerar áudio de resposta (Text-to-Speech) → a resposta aparece como
  texto em vez de tocar áudio.

## Limitações conhecidas desta primeira versão

- Comando de voz é gravado inteiro (push-to-talk) e enviado de uma vez ao
  Speech-to-Text — sem transcrição em streaming. Bom para comandos curtos;
  a API síncrona usada tem limite de ~1 minuto por áudio.
- Sem instalador — roda via `npm start`. Empacotamento (`electron-builder`)
  fica para depois, se for necessário.
- Botão "Tela" é só visual nesta versão (ver acima).

## Estrutura

```
voz-widget-windows/
├── electron/        # processo principal (janela, bandeja, atalho, IPC)
├── src/              # Speech-to-Text, Text-to-Speech, cliente do Master Controller
├── renderer/           # HTML/CSS/JS da interface (visual "cristal líquido")
└── assets/              # ícones
```

Não relacionado ao webhook do WhatsApp na raiz deste repositório
(`server.js`) — são dois projetos independentes convivendo no mesmo repo.
