import express from 'express';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const APP_SECRET = process.env.META_APP_SECRET || '';

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
  limit: '4mb'
}));

function verifySignature(req) {
  if (!APP_SECRET) return true;
  const signature = req.get('x-hub-signature-256');
  if (!signature || !req.rawBody) return false;
  const expected =
    'sha256=' +
    crypto.createHmac('sha256', APP_SECRET).update(req.rawBody).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

app.post('/webhook', (req, res) => {
  if (!verifySignature(req)) {
    return res.sendStatus(403);
  }

  const body = req.body;

  if (body.object !== 'whatsapp_business_account') {
    return res.sendStatus(404);
  }

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;

      const value = change.value || {};
      const messages = value.messages || [];
      const statuses = value.statuses || [];

      for (const msg of messages) {
        console.log(JSON.stringify({
          event_type: 'message',
          message_id: msg.id,
          from: msg.from,
          type: msg.type,
          timestamp: msg.timestamp,
          phone_number_id: value.metadata?.phone_number_id,
          raw: msg
        }));
      }

      for (const status of statuses) {
        console.log(JSON.stringify({
          event_type: 'status',
          message_id: status.id,
          recipient_id: status.recipient_id,
          status: status.status,
          timestamp: status.timestamp,
          phone_number_id: value.metadata?.phone_number_id,
          raw: status
        }));
      }
    }
  }

  return res.sendStatus(200);
});

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Webhook listening on port ${PORT}`);
});
