const speech = require('@google-cloud/speech');
const config = require('./config');
const log = require('./logger');

let client = null;

function getClient() {
  if (!client) {
    client = new speech.SpeechClient(
      config.googleCloudProject ? { projectId: config.googleCloudProject } : undefined
    );
  }
  return client;
}

async function transcribe(audioBuffer) {
  try {
    const [response] = await getClient().recognize({
      audio: { content: audioBuffer.toString('base64') },
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: config.sttLanguageCode,
        enableAutomaticPunctuation: true,
        model: 'latest_short'
      }
    });

    const text = (response.results || [])
      .map((result) => result.alternatives[0]?.transcript || '')
      .join(' ')
      .trim();

    return { ok: true, text };
  } catch (error) {
    log.error('[speechToText] falha na transcrição', error);
    return { ok: false, error: 'Falha ao transcrever áudio: ' + error.message };
  }
}

module.exports = { transcribe };
