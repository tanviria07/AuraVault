export type VoiceIntent =
  | { kind: 'find'; target: string }
  | { kind: 'checkout' }
  | { kind: 'unknown' };

const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const INTENT_PROMPT = `You are the intent router for a voice-controlled shopping extension.
Read the voice command transcript below and return a strict JSON object with exactly these keys:
{ "intent": "find" | "checkout" | "other", "target": string }

Rules:
- Respond with raw JSON only. No markdown, no code fences, no commentary.
- Use "find" when the user wants to locate, highlight, or scroll to something on the page; "target" is the text to highlight.
- Use "checkout" when the user wants to pay, check out, buy, or place an order; "target" may be an empty string.
- Use "other" for anything else; "target" may be an empty string.

Transcript:
`;

/**
 * Classifies a voice transcript into a VoiceIntent via Gemini.
 * Without an API key, falls back to a local regex classifier so the demo still works.
 */
export async function classifyIntent(transcript: string, apiKey?: string): Promise<VoiceIntent> {
  if (!apiKey) {
    return fallbackIntent(transcript);
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: INTENT_PROMPT + transcript }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Gemini API request failed with status ${response.status}: ${body.slice(0, 200)}`);
  }

  const payload: unknown = await response.json();
  const text = extractTextFromPayload(payload);
  return parseIntentJson(text);
}

function extractTextFromPayload(payload: unknown): string {
  const text = (payload as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  })?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (typeof text !== 'string' || text.trim() === '') {
    throw new Error('Gemini API returned an empty or malformed response');
  }
  return text;
}

/** Parses Gemini's JSON response into a VoiceIntent. Tolerates markdown code fences. */
export function parseIntentJson(raw: string): VoiceIntent {
  let cleaned = raw.trim();

  const fenced = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/i);
  if (fenced) {
    cleaned = fenced[1].trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end <= start) {
      return { kind: 'unknown' };
    }
    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return { kind: 'unknown' };
    }
  }

  const record = parsed as { intent?: unknown; target?: unknown };
  const target = typeof record.target === 'string' ? record.target.trim() : '';

  if (record.intent === 'checkout') {
    return { kind: 'checkout' };
  }
  if (record.intent === 'find' && target !== '') {
    return { kind: 'find', target };
  }
  return { kind: 'unknown' };
}

/** Regex classifier used when no Gemini API key is configured. */
export function fallbackIntent(transcript: string): VoiceIntent {
  const text = transcript.trim();
  if (/\b(check\s*out|checkout|pay now|buy now|purchase|place (the )?order|complete (the )?purchase)\b/i.test(text)) {
    return { kind: 'checkout' };
  }
  const findMatch = text.match(/^(?:find|search(?: for)?|look for|locate|highlight|show me)\s+(.+)$/i);
  if (findMatch && findMatch[1].trim() !== '') {
    return { kind: 'find', target: findMatch[1].trim() };
  }
  return { kind: 'unknown' };
}
