// VoiceIntent mirrors src/background/intent.ts; duplicated here because content
// scripts run as classic scripts and cannot import ES modules.
type VoiceIntent =
  | { kind: 'find'; target: string }
  | { kind: 'checkout' }
  | { kind: 'unknown' };

(() => {
  let listening = false;

  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'auravault-voice-toggle';
  button.textContent = 'AuraVault Voice';
  Object.assign(button.style, {
    position: 'fixed',
    right: '16px',
    bottom: '16px',
    zIndex: '2147483647',
    padding: '10px 14px',
    borderRadius: '999px',
    border: 'none',
    background: '#5b3df5',
    color: '#ffffff',
    font: '600 13px/1 system-ui, sans-serif',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
  });
  button.addEventListener('click', () => {
    listening = !listening;
    button.style.background = listening ? '#d43f8c' : '#5b3df5';
    void chrome.runtime
      .sendMessage({ type: listening ? 'START_LISTENING' : 'STOP_LISTENING' })
      .catch(() => {});
  });
  document.documentElement.appendChild(button);

  chrome.runtime.onMessage.addListener(
    (message: { type?: string; intent?: VoiceIntent; error?: string }) => {
      if (message?.type === 'VOICE_INTENT' && message.intent) {
        handleIntent(message.intent);
      } else if (message?.type === 'VOICE_ERROR') {
        listening = false;
        button.style.background = '#5b3df5';
      }
    }
  );

  function handleIntent(intent: VoiceIntent): void {
    if (intent.kind === 'find' && intent.target) {
      highlightTarget(intent.target);
    } else if (intent.kind === 'checkout') {
      triggerCheckout();
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

  function triggerCheckout(): void {
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>(
        'button, a, [role="button"], input[type="submit"]'
      )
    );
    const checkout = candidates.find((el) =>
      /check\s*out|checkout|pay now|buy now|place order|complete (purchase|order)/i.test(
        el.textContent ?? ''
      )
    );
    if (checkout) {
      checkout.scrollIntoView({ behavior: 'smooth', block: 'center' });
      checkout.click();
      return;
    }
    document.dispatchEvent(new CustomEvent('auravault:voice-checkout'));
  }
})();
