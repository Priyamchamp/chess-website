import React from 'react';
import MatchmakingLobby from '../components/game/MatchmakingLobby';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

/**
 * Matchmaking page component that wraps the MatchmakingLobby component
 */
function Matchmaking() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  return (
    <div className="matchmaking-page">
      <Toaster position="top-right" />
      <MatchmakingLobby />
    </div>
  );
}

export default Matchmaking; 