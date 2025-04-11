import React from 'react';
import Leaderboard from '../components/game/Leaderboard';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

/**
 * Leaderboard page component that wraps the Leaderboard component
 */
function LeaderboardPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="leaderboard-page">
      <Toaster position="top-right" />
      <Leaderboard />
    </div>
  );
}

export default LeaderboardPage; 