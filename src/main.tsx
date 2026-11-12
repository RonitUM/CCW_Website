import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initClicks } from './clicks';

initClicks();
createRoot(document.getElementById('root')!).render(<App />);
