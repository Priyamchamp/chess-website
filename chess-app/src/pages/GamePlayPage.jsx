import React, { useEffect } from 'react';
import OnlineGame from '../components/game/OnlineGame';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

/**
 * Game Play page component that wraps the OnlineGame component for online matches
 */
function GamePlayPage() {
  const { currentUser } = useAuth();
  const { loadActiveGames } = useGame();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);
  
  // Load active games when component mounts
  useEffect(() => {
    const unsubscribe = loadActiveGames();
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [loadActiveGames]);

  return (
    <div className="gameplay-page">
      <Toaster position="top-right" />
      <OnlineGame />
    </div>
  );
}

export default GamePlayPage; 