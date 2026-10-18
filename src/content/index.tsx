import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import cssText from './content.css?inline';
import { FloatingBar } from './FloatingBar';

const HOST_ID = 'auravault-floating-bar-host';

/**
 * Mount the floating UI bar inside a Shadow DOM root so page styles
 * cannot leak in and our styles cannot leak out.
 */
function mountFloatingBar(): void {
  if (document.getElementById(HOST_ID)) return;

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.position = 'fixed';
  host.style.bottom = '24px';
  host.style.right = '24px';
  host.style.zIndex = '2147483647';

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = cssText;
  shadow.appendChild(style);

  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  document.documentElement.appendChild(host);

  createRoot(mountPoint).render(
    <StrictMode>
      <FloatingBar />
    </StrictMode>,
  );
}

mountFloatingBar();
