# Webhook público HTTPS - Meta WhatsApp Cloud API

Este projeto cria um endpoint mínimo para o webhook da Meta em `/webhook`.

## O que ele faz

- Responde à verificação `GET /webhook` com `hub.challenge` quando o `hub.verify_token` bater com a variável de ambiente.
- Recebe eventos `POST /webhook` de mensagens e status.
- Valida a assinatura `X-Hub-Signature-256` quando `META_APP_SECRET` estiver configurado.
- Responde rápido com HTTP 200.

## Variáveis de ambiente

Use estas variáveis no Render:

- `PORT=3000`
- `META_VERIFY_TOKEN=troque-por-um-segredo-forte`
- `META_APP_SECRET=troque-pelo-app-secret-da-meta`

## Publicação

Depois de subir este repositório no Render como Web Service, a URL final do webhook ficará assim:

```text
https://seu-servico.onrender.com/webhook
```

## Configuração na Meta

Na Meta, use:
- **Callback URL**: `https://seu-servico.onrender.com/webhook`
- **Verify token**: exatamente o mesmo valor de `META_VERIFY_TOKEN`

## Próximos passos

1. Publicar no Render.
2. Configurar as variáveis de ambiente.
3. Validar o webhook na Meta.
4. Assinar o campo `messages`.
5. Testar o recebimento dos eventos.
