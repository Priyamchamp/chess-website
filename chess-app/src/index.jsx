import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { GameProvider } from './contexts/GameContext';
import { Toaster } from 'react-hot-toast';
import './index.css';
// Import the ChessEngine to ensure it's available throughout the app
import './services/ChessEngine';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <GameProvider>
          <App />
          <Toaster position="top-center" />
        </GameProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
); 