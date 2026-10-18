import type { VoiceIntent } from '../background/intent';

function canMessage(): boolean {
  return typeof chrome !== 'undefined' && typeof chrome.runtime?.sendMessage === 'function';
}

/**
 * Begin capturing the user's voice command: asks the background worker to spin
 * up the offscreen document that owns the microphone.
 */
export function startListening(): void {
  if (!canMessage()) {
    return;
  }
  void chrome.runtime
    .sendMessage({ type: 'START_LISTENING' })
    .catch((err: unknown) => console.warn('[AuraVault] failed to start listening:', err));
}

/** Stop the offscreen speech recognizer. */
export function stopListening(): void {
  if (!canMessage()) {
    return;
  }
  void chrome.runtime.sendMessage({ type: 'STOP_LISTENING' }).catch(() => {});
}

/**
 * Open the Visa Acceptance checkout overlay.
 * TODO: wire up to the Visa overlay flow against the local simulator
 * (http://localhost:3000).
 */
export function triggerVisaOverlay(): void {
  console.log('[AuraVault] triggerVisaOverlay() — not yet implemented');
}

/** Subscribe to VOICE_INTENT results routed back from the background worker. */
export function initVoiceIntentListener(): void {
  if (typeof chrome === 'undefined' || typeof chrome.runtime?.onMessage?.addListener !== 'function') {
    return;
  }
  chrome.runtime.onMessage.addListener(
    (message: { type?: string; intent?: VoiceIntent; error?: string }) => {
      if (message?.type === 'VOICE_INTENT' && message.intent) {
        handleIntent(message.intent);
      } else if (message?.type === 'VOICE_ERROR') {
        console.warn('[AuraVault] voice error:', message.error);
      }
    }
  );
}

function handleIntent(intent: VoiceIntent): void {
  if (intent.kind === 'find' && intent.target) {
    highlightTarget(intent.target);
  } else if (intent.kind === 'checkout') {
    triggerVisaOverlay();
  }
}

function highlightTarget(target: string): void {
  const needle = target.toLowerCase();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node.textContent ?? '';
    const index = text.toLowerCase().indexOf(needle);
    if (index !== -1 && node.parentElement) {
      const mark = document.createElement('mark');
      mark.className = 'auravault-voice-highlight';
      mark.style.cssText = 'background:#ffe14d;padding:0 2px;border-radius:2px;';
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + needle.length);
      try {
        range.surroundContents(mark);
        mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {
        node.parentElement.style.outline = '2px solid #ffe14d';
        node.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    node = walker.nextNode();
  }
}
