import '@fontsource/caveat/400.css';
import '@fontsource/caveat/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';

import React from 'react';
import ReactDOM from 'react-dom/client';

import { GlobalStyles } from '@/shared/components/theme';

import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <>
      <GlobalStyles />
      <App />
    </>
  </React.StrictMode>,
);
