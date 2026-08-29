(function () {
  const btnVoice = document.getElementById('btnVoice');
  const statusEl = document.getElementById('status');
  const respToggle = document.getElementById('respToggle');
  const responseCard = document.getElementById('responseCard');
  const responseLabel = document.getElementById('responseLabel');
  const responseText = document.getElementById('responseText');
  const ttsPlayer = document.getElementById('ttsPlayer');

  // false = "Falada" (padrão), true = "Escrita" (silenciosa) — espelha o toggle visual.
  let writtenMode = false;
  let mediaRecorder = null;
  let recordedChunks = [];
  let isRecording = false;

  function setStatus(text, { dim = true, error = false } = {}) {
    statusEl.textContent = text;
    statusEl.classList.toggle('dim', dim);
    statusEl.classList.toggle('error', error);
  }

  function resetIdle() {
    setStatus('Em repouso — toque para começar');
  }

  function showResponseCard(label, text) {
    responseLabel.textContent = label;
    responseText.textContent = text;
    responseCard.classList.add('show');
  }

  function hideResponseCard() {
    responseCard.classList.remove('show');
  }

  function toggleResponseMode() {
    writtenMode = !writtenMode;
    respToggle.classList.toggle('on', writtenMode);
  }

  async function startRecording() {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      setStatus('Permissão de microfone negada', { error: true });
      window.api.logClientError('mic-permission', String(error && error.message ? error.message : error));
      return;
    }

    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });

    mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) recordedChunks.push(event.data);
    });

    mediaRecorder.addEventListener('stop', () => {
      stream.getTracks().forEach((track) => track.stop());
      handleRecordingComplete();
    });

    mediaRecorder.start();
    isRecording = true;
    btnVoice.classList.add('active');
    setStatus('Ouvindo…', { dim: false });
  }

  function stopRecording() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      isRecording = false;
      btnVoice.classList.remove('active');
    }
  }

  async function handleRecordingComplete() {
    setStatus('Processando…');
    hideResponseCard();

    const blob = new Blob(recordedChunks, { type: 'audio/webm;codecs=opus' });
    const arrayBuffer = await blob.arrayBuffer();

    const sttResult = await window.api.transcribe(arrayBuffer, blob.type);
    if (!sttResult.ok) {
      setStatus(sttResult.error, { error: true });
      return;
    }

    const transcript = sttResult.text;
    if (!transcript) {
      setStatus('Não entendi — tente novamente');
      return;
    }

    showResponseCard('Você disse', transcript);
    setStatus('Enviando ao Master Controller…', { dim: false });

    const mcResult = await window.api.sendToMasterController(transcript);
    if (!mcResult.ok) {
      showResponseCard('Você disse (não enviado)', transcript);
      setStatus(mcResult.error, { error: true });
      return;
    }

    resetIdle();

    if (!mcResult.reply) {
      showResponseCard('Master Controller', 'Recebido.');
      return;
    }

    if (writtenMode) {
      showResponseCard('Master Controller', mcResult.reply);
      return;
    }

    const ttsResult = await window.api.speak(mcResult.reply);
    if (!ttsResult.ok) {
      // Sem áudio disponível: cai para texto em vez de perder a resposta.
      showResponseCard('Master Controller', mcResult.reply);
      setStatus(ttsResult.error, { error: true });
      return;
    }

    ttsPlayer.src = `data:${ttsResult.mimeType};base64,${ttsResult.audioBase64}`;
    setStatus('🔊 Respondendo por voz…', { dim: false });
    ttsPlayer.play().catch(() => {});
    ttsPlayer.onended = resetIdle;
  }

  btnVoice.addEventListener('click', () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });

  respToggle.addEventListener('click', toggleResponseMode);

  if (window.api && window.api.onShown) {
    window.api.onShown(() => {
      if (!isRecording) resetIdle();
    });
  }
})();
