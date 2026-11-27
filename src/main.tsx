import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  captureRuntimeError,
  getReactRootErrorCallbacks,
  initSentry,
} from './utils/sentry';
import './index.css';
import './print.css';

initSentry();

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegisterError(error) {
      captureRuntimeError(error, { source: 'pwa-service-worker' });
    },
  });
}

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement, getReactRootErrorCallbacks()).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
