const config = require('./config');
const log = require('./logger');

const TIMEOUT_MS = 10000;

async function send(text) {
  if (!config.masterControllerUrl) {
    const error = 'MASTER_CONTROLLER_URL não configurado (.env)';
    log.warn('[masterController] ' + error);
    return { ok: false, error };
  }

  try {
    const response = await fetch(config.masterControllerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'voice-widget-windows',
        text,
        timestamp: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });

    if (!response.ok) {
      const error = `Master Controller respondeu ${response.status}`;
      log.error('[masterController] ' + error);
      return { ok: false, error };
    }

    let reply;
    try {
      const body = await response.json();
      reply = body?.reply;
    } catch {
      reply = undefined;
    }

    return { ok: true, reply };
  } catch (error) {
    const isTimeout = error.name === 'TimeoutError' || error.name === 'AbortError';
    const message = isTimeout
      ? 'Master Controller não respondeu a tempo'
      : 'Master Controller inacessível';
    log.error('[masterController] ' + message, error);
    return { ok: false, error: message };
  }
}

module.exports = { send };
