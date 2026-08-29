(function () {
  const btnVoice = document.getElementById('btnVoice');
  const btnClose = document.getElementById('btnClose');
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

    try {
      await processRecording();
    } catch (error) {
      // Rede de segurança: qualquer erro inesperado aparece na tela em vez
      // de deixar o status preso em "Processando…" para sempre.
      setStatus('Erro inesperado: ' + (error && error.message ? error.message : error), { error: true });
    }
  }

  async function processRecording() {
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

  if (!window.api) {
    // preload.js não carregou (bug de configuração do Electron) — sem isso,
    // os botões pareceriam simplesmente não fazer nada, sem nenhuma pista.
    setStatus('Erro interno: preload não carregado — reinicie o widget', { error: true });
    return;
  }

  btnVoice.addEventListener('click', () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });

  respToggle.addEventListener('click', toggleResponseMode);

  btnClose.addEventListener('click', () => {
    if (isRecording) stopRecording();
    window.api.hide();
  });

  window.api.onShown(() => {
    if (!isRecording) resetIdle();
  });
})();
