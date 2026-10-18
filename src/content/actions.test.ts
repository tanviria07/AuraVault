import { describe, expect, it } from 'vitest';
import { startListening, triggerVisaOverlay } from './actions';

describe('placeholder actions', () => {
  it('startListening is callable without throwing', () => {
    expect(() => startListening()).not.toThrow();
  });

  it('triggerVisaOverlay is callable without throwing', () => {
    expect(() => triggerVisaOverlay()).not.toThrow();
  });
});
