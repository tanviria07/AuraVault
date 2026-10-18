import React, { useState } from 'react';

const AUTHORIZE_URL = 'http://localhost:3000/api/visa/authorize';

type CheckoutState =
  | { phase: 'idle' }
  | { phase: 'processing' }
  | { phase: 'success'; transactionId: string }
  | { phase: 'error'; message: string };

export function VisaCheckout({ cartTotal = 0 }: { cartTotal?: number }) {
  const [state, setState] = useState<CheckoutState>({ phase: 'idle' });

  const pay = async () => {
    setState({ phase: 'processing' });
    try {
      const res = await fetch(AUTHORIZE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartTotal }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'authorized') {
        setState({ phase: 'success', transactionId: data.transactionId });
      } else {
        setState({ phase: 'error', message: data.reason ?? 'Authorization declined' });
      }
    } catch {
      setState({ phase: 'error', message: 'Could not reach the Visa server' });
    }
  };

  const formatted = `$${cartTotal.toFixed(2)}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483647,
        background: '#0b0e14',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        gap: '32px',
      }}
    >
      <div style={{ fontSize: '20px', letterSpacing: '4px', color: '#8a94a6' }}>
        AURAVAULT CHECKOUT
      </div>

      {state.phase === 'success' ? (
        <div
          style={{
            background: '#10351f',
            border: '2px solid #2ea043',
            borderRadius: '16px',
            padding: '48px 64px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '48px', color: '#3fb950', fontWeight: 700 }}>
            Payment Authorized
          </div>
          <div style={{ fontSize: '44px', margin: '16px 0' }}>{formatted}</div>
          <div style={{ fontSize: '24px', color: '#7ee787' }}>
            Receipt: {state.transactionId}
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: '56px', fontWeight: 800 }}>{formatted}</div>

          {state.phase === 'error' && (
            <div style={{ color: '#f85149', fontSize: '22px' }}>{state.message}</div>
          )}

          <button
            onClick={pay}
            disabled={state.phase === 'processing'}
            style={{
              fontSize: '36px',
              fontWeight: 700,
              padding: '32px 96px',
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
              color: '#fff',
              background: 'linear-gradient(135deg, #1a1f71, #2f3fbd)',
              boxShadow: '0 12px 40px rgba(47, 63, 189, 0.5)',
              opacity: state.phase === 'processing' ? 0.6 : 1,
            }}
          >
            {state.phase === 'processing' ? 'Authorizing…' : 'Pay with Visa'}
          </button>
        </>
      )}
    </div>
  );
}

export default VisaCheckout;
