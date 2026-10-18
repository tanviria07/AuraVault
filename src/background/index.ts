import { classifyIntent } from './intent';

const OFFSCREEN_DOCUMENT_URL = 'offscreen.html';

let offscreenCreation: Promise<void> | null = null;
let listeningTabId: number | null = null;

/**
 * Creates the offscreen document that owns microphone access (content scripts
 * cannot use the mic). USER_MEDIA grants the mic permission SpeechRecognition needs.
 */
export async function ensureOffscreenDocument(): Promise<void> {
  if (await chrome.offscreen.hasDocument()) {
    return;
  }
  if (!offscreenCreation) {
    offscreenCreation = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_DOCUMENT_URL,
        reasons: [chrome.offscreen.Reason.USER_MEDIA],
        justification: 'Speech Recognition',
      })
      .finally(() => {
        offscreenCreation = null;
      });
  }
  return offscreenCreation;
}

async function getGeminiApiKey(): Promise<string> {
  const stored = await chrome.storage.local.get('geminiApiKey');
  return typeof stored.geminiApiKey === 'string' ? stored.geminiApiKey : '';
}

async function sendToListeningTab(message: Record<string, unknown>): Promise<void> {
  if (listeningTabId === null) {
    return;
  }
  try {
    await chrome.tabs.sendMessage(listeningTabId, message);
  } catch {
    listeningTabId = null;
  }
}

async function handleTranscript(transcript: string): Promise<void> {
  if (transcript.trim() === '' || listeningTabId === null) {
    return;
  }
  try {
    const apiKey = await getGeminiApiKey();
    const intent = await classifyIntent(transcript, apiKey);
    await sendToListeningTab({ type: 'VOICE_INTENT', intent });
  } catch (err) {
    await sendToListeningTab({ type: 'VOICE_ERROR', error: String(err) });
  }
}

chrome.runtime.onMessage.addListener(
  (message: { type?: string; transcript?: string }, sender, sendResponse) => {
    switch (message?.type) {
      case 'START_LISTENING': {
        if (typeof sender.tab?.id === 'number') {
          listeningTabId = sender.tab.id;
        }
        ensureOffscreenDocument()
          .then(() => chrome.runtime.sendMessage({ type: 'START_LISTENING' }))
          .then(() => sendResponse({ ok: true }))
          .catch((err: unknown) => sendResponse({ ok: false, error: String(err) }));
        return true;
      }
      case 'STOP_LISTENING': {
        listeningTabId = null;
        void chrome.runtime.sendMessage({ type: 'STOP_LISTENING' }).catch(() => {});
        return false;
      }
      case 'VOICE_TRANSCRIPT': {
        void handleTranscript(String(message.transcript ?? ''));
        return false;
      }
      case 'VOICE_ERROR': {
        void sendToListeningTab({ type: 'VOICE_ERROR', error: String(message.transcript ?? '') });
        return false;
      }
      default:
        return false;
    }
  }
);
