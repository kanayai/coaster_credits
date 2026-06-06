import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

declare global {
  interface Window {
    __ccDebug?: {
      stage?: string;
      updatedAt?: string;
      href?: string;
      note?: string;
    };
    __CC_INSTALL_MODE__?: boolean;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const isInstallMode =
  window.location.search.includes('install=1') ||
  window.location.hash === '#install';
const isStandaloneLaunch =
  typeof window !== 'undefined' &&
  (((window.navigator as Navigator & { standalone?: boolean }).standalone) ||
    window.matchMedia('(display-mode: standalone)').matches);

if (isInstallMode) {
  if (isStandaloneLaunch) {
    window.location.replace('/');
  } else {
  window.__CC_INSTALL_MODE__ = true;
  root.render(
    <div
      style={{
        minHeight: '100vh',
        background: '#020617',
        color: '#fff',
        fontFamily: 'Inter, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '32px',
          padding: '28px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              background: '#0ea5e9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 900,
              fontSize: '22px',
            }}
          >
            C
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7dd3fc' }}>
              Install Mode
            </div>
            <h1 style={{ margin: '4px 0 0', fontSize: '28px', lineHeight: 1.1, fontWeight: 800 }}>CoasterCount Pro</h1>
          </div>
        </div>
        <p style={{ margin: '0 0 18px', color: '#cbd5e1', fontSize: '14px', lineHeight: 1.6 }}>
          This stripped-down page is for adding the app to your Home Screen without loading the full app shell.
        </p>
        <ol style={{ margin: '0 0 18px', paddingLeft: '18px', color: '#e2e8f0', fontSize: '14px', lineHeight: 1.7 }}>
          <li>Tap the Share button in Safari.</li>
          <li>Choose Add to Home Screen.</li>
          <li>After installation, open the main app URL from Safari when needed.</li>
        </ol>
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '18px',
            background: 'rgba(245,158,11,.12)',
            border: '1px solid rgba(245,158,11,.28)',
            color: '#fde68a',
            fontSize: '13px',
            lineHeight: 1.6,
          }}
        >
          Google sign-in is intentionally blocked inside Home Screen mode. Sign in from Safari, then use the installed app for browsing.
        </div>
        <a
          href="/"
          style={{
            display: 'block',
            marginTop: '18px',
            textAlign: 'center',
            textDecoration: 'none',
            background: '#0ea5e9',
            color: '#fff',
            padding: '14px 16px',
            borderRadius: '18px',
            fontWeight: 800,
          }}
        >
          Open Full App
        </a>
      </div>
    </div>
  );
  }
} else {

const getDebugSnapshot = () => {
  const debug = window.__ccDebug;
  const lines = [
    `URL: ${window.location.href}`,
    `User agent: ${window.navigator.userAgent}`,
  ];

  if (debug?.stage) {
    lines.push(`Boot stage: ${debug.stage}`);
  }
  if (debug?.updatedAt) {
    lines.push(`Updated: ${debug.updatedAt}`);
  }
  if (debug?.note) {
    lines.push(`Note: ${debug.note}`);
  }

  return lines.join('\n');
};

const renderFatalError = (title: string, detail: string) => {
  root.render(
    <div
      style={{
        minHeight: '100vh',
        background: '#020617',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ color: '#f87171', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '12px', marginBottom: '12px' }}>
          Runtime Error
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 12px' }}>{title}</h1>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            background: '#020617',
            border: '1px solid #1e293b',
            borderRadius: '16px',
            padding: '16px',
            color: '#cbd5e1',
            fontSize: '13px',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {[detail, getDebugSnapshot()].filter(Boolean).join('\n\n')}
        </pre>
      </div>
    </div>
  );
};

window.addEventListener('error', (event) => {
  const location =
    event.filename || event.lineno || event.colno
      ? `Source: ${event.filename || 'unknown'}:${event.lineno || 0}:${event.colno || 0}`
      : '';
  const detail = [event.error?.stack || event.message || 'Unknown window error', location]
    .filter(Boolean)
    .join('\n');
  console.error('Global window error', event.error || event.message);
  renderFatalError('The app crashed after startup.', detail);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const detail =
    reason instanceof Error
      ? reason.stack || reason.message
      : typeof reason === 'string'
        ? reason
        : JSON.stringify(reason, null, 2);
  console.error('Unhandled promise rejection', reason);
  renderFatalError('An async operation failed.', detail || 'Unknown promise rejection');
});

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
}
