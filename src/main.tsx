import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PanelConfig } from './components/PanelConfig';
import { EditorPage } from './components/EditorPage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/quadro-maker">
      <Routes>
        <Route path="/" element={<PanelConfig />} />
        <Route path="/project/:id" element={<EditorPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
