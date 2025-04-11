import React from 'react';
import ChessGame from './ChessGame';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

/**
 * Bot Game page component that wraps the ChessGame component with bot mode
 */
function BotGamePage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  return (
    <div className="bot-game-page">
      <Toaster position="top-right" />
      <ChessGame mode="bot" />
    </div>
  );
}

export default BotGamePage; 