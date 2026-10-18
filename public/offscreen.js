// AuraVault offscreen document.
// Content scripts cannot access the microphone, so speech recognition runs
// here and transcripts are relayed to the background service worker.

const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let listening = false;

function startRecognition() {
  if (!SpeechRecognitionImpl) {
    chrome.runtime.sendMessage({
      type: 'VOICE_ERROR',
      error: 'SpeechRecognition is not available in this browser',
    });
    return;
  }
  if (recognition) {
    return;
  }

  listening = true;
  recognition = new SpeechRecognitionImpl();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (result.isFinal) {
        chrome.runtime.sendMessage({
          type: 'VOICE_TRANSCRIPT',
          transcript: result[0].transcript.trim(),
        });
      }
    }
  };

  recognition.onerror = (event) => {
    chrome.runtime.sendMessage({ type: 'VOICE_ERROR', error: event.error });
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      listening = false;
      recognition = null;
    }
  };

  recognition.onend = () => {
    recognition = null;
    // continuous still ends on silence timeouts; restart while listening is on.
    if (listening) {
      startRecognition();
    }
  };

  recognition.start();
}

function stopRecognition() {
  listening = false;
  if (recognition) {
    const active = recognition;
    recognition = null;
    active.onend = null;
    active.stop();
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (!message || typeof message !== 'object') {
    return;
  }
  if (message.type === 'START_LISTENING') {
    startRecognition();
  } else if (message.type === 'STOP_LISTENING') {
    stopRecognition();
  }
});
