import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import './index.css';
import App from './App.jsx';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Check if the publishable key is valid (must start with pk_test_ or pk_live_)
const isValidKey = PUBLISHABLE_KEY && 
  (PUBLISHABLE_KEY.startsWith('pk_test_') || PUBLISHABLE_KEY.startsWith('pk_live_'));

const RootComponent = () => {
  if (!isValidKey) {
    return (
      <div className="min-h-screen bg-[#f0f9ff] flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-white p-10 rounded-[40px] shadow-2xl border border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold">!</div>
          <h1 className="text-2xl font-black text-slate-800 mb-4">Wymagana konfiguracja Clerk</h1>
          <p className="text-slate-500 mb-6">
            Brak prawidłowego klucza <strong>VITE_CLERK_PUBLISHABLE_KEY</strong> w pliku konfiguracyjnym <code>.env</code>.
          </p>
          <div className="bg-slate-50 p-4 rounded-2xl text-left text-xs font-mono text-slate-600 mb-6">
            1. Otwórz plik <code className="font-bold">.env</code> w głównym katalogu<br/>
            2. Wklej swój klucz z panelu Clerk (musi zaczynać się od <code className="text-emerald-600">pk_test_</code> lub <code className="text-emerald-600">pk_live_</code>):<br/>
            <code className="text-emerald-500">VITE_CLERK_PUBLISHABLE_KEY=pk_test_...</code>
          </div>
          <p className="text-sm text-slate-400">
            Po dodaniu poprawnego klucza i zapisaniu pliku, strona odświeży się automatycznie.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <App />
    </ClerkProvider>
  );
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootComponent />
  </StrictMode>
);
