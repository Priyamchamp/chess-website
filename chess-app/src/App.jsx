import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import GamePage from './pages/GamePage';
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import PrivateRoute from './components/auth/PrivateRoute';
import Matchmaking from './pages/Matchmaking';
import GamePlayPage from './pages/GamePlayPage';
import LeaderboardPage from './pages/LeaderboardPage';
import BotGamePage from './pages/BotGamePage';
import AdminPage from './pages/AdminPage';
import { FirestoreProvider } from './contexts/FirestoreContext';
import { GameProvider } from './contexts/GameContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <FirestoreProvider>
          <GameProvider>
            <div className="min-h-screen bg-gray-50">
              <Toaster position="top-right" />
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />

                {/* Protected routes */}
                <Route path="/" element={
                  <PrivateRoute>
                    <GamePage />
                  </PrivateRoute>
                } />
                <Route path="/matchmaking" element={
                  <PrivateRoute>
                    <Matchmaking />
                  </PrivateRoute>
                } />
                <Route path="/game/:gameId" element={
                  <PrivateRoute>
                    <GamePlayPage />
                  </PrivateRoute>
                } />
                <Route path="/game/bot" element={
                  <PrivateRoute>
                    <BotGamePage />
                  </PrivateRoute>
                } />
                <Route path="/leaderboard" element={
                  <PrivateRoute>
                    <LeaderboardPage />
                  </PrivateRoute>
                } />
                <Route path="/admin" element={
                  <PrivateRoute>
                    <AdminPage />
                  </PrivateRoute>
                } />
                
                {/* Fallback route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </GameProvider>
        </FirestoreProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;