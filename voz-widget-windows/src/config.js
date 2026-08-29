const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
  masterControllerUrl: process.env.MASTER_CONTROLLER_URL || '',
  sttLanguageCode: process.env.STT_LANGUAGE_CODE || 'pt-BR',
  ttsLanguageCode: process.env.TTS_LANGUAGE_CODE || 'pt-BR',
  ttsVoiceName: process.env.TTS_VOICE_NAME || 'pt-BR-Wavenet-B',
  googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT || undefined
};
