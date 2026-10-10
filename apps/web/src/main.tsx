import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { applyLanguage, readStoredLanguage, resolveInitialLanguage } from './i18n/index.js';
import { applyTheme, readTheme } from './lib/theme.js';
import { QuoteBasketProvider } from './lib/quoteBasket.js';
import App from './App.js';

// Theme and language are applied before the first render so the page never flashes the wrong mode.
applyTheme(readTheme());
applyLanguage(resolveInitialLanguage(window.location.search, readStoredLanguage()));

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element in index.html');

// Offline support: production only, so development never serves stale bundles.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
  });
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <QuoteBasketProvider>
        <App />
      </QuoteBasketProvider>
    </BrowserRouter>
  </StrictMode>,
);
