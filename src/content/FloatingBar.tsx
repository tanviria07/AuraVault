import { useState } from 'react';
import { startListening, triggerVisaOverlay } from './actions';

function MicIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-8 w-8"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  );
}

export function FloatingBar() {
  const [listening, setListening] = useState(false);

  const onMicClick = () => {
    setListening((prev) => !prev);
    startListening();
  };

  const onSimplifyClick = () => {
    triggerVisaOverlay();
  };

  return (
    <div
      role="toolbar"
      aria-label="AuraVault assistant"
      className="flex items-center gap-4 rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-2xl"
    >
      <button
        type="button"
        onClick={onMicClick}
        aria-label={listening ? 'Stop listening' : 'Start voice command'}
        aria-pressed={listening}
        className={`flex h-16 w-16 items-center justify-center rounded-full border-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500 ${
          listening
            ? 'border-red-700 bg-red-600 text-white'
            : 'border-slate-900 bg-slate-900 text-white'
        }`}
      >
        <MicIcon />
      </button>
      <button
        type="button"
        onClick={onSimplifyClick}
        className="rounded-xl border-2 border-slate-900 bg-yellow-300 px-6 py-3 text-2xl font-bold text-slate-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500"
      >
        Simplify
      </button>
    </div>
  );
}
