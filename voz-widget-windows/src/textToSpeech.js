const textToSpeech = require('@google-cloud/text-to-speech');
const config = require('./config');
const log = require('./logger');

let client = null;

function getClient() {
  if (!client) {
    client = new textToSpeech.TextToSpeechClient(
      config.googleCloudProject ? { projectId: config.googleCloudProject } : undefined
    );
  }
  return client;
}

async function synthesize(text) {
  try {
    const [response] = await getClient().synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: config.ttsLanguageCode,
        name: config.ttsVoiceName
      },
      audioConfig: { audioEncoding: 'MP3' }
    });

    return {
      ok: true,
      audioBase64: Buffer.from(response.audioContent).toString('base64'),
      mimeType: 'audio/mp3'
    };
  } catch (error) {
    log.error('[textToSpeech] falha na síntese', error);
    return { ok: false, error: 'Falha ao gerar áudio de resposta: ' + error.message };
  }
}

module.exports = { synthesize };
