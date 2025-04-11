import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import GameModes from '../components/game/GameModes';
import { useGame } from '../contexts/GameContext';
import ChessGame from './ChessGame';
import { motion } from 'framer-motion';

function GamePage() {
  const { hasActiveGame, isLoading, playerColor, activeGameId, gameState } = useGame();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div className="flex-grow container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : hasActiveGame ? (
          <div className="w-full">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Active Chess Game</h1>
                <Link 
                  to="/matchmaking" 
                  className="py-2 px-4 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                >
                  Return to Matchmaking
                </Link>
              </div>
              
              <ChessGame 
                mode="online"
                gameId={activeGameId}
                playerColor={playerColor} 
                gameState={gameState}
              />
            </motion.div>
          </div>
        ) : (
          <GameModes />
        )}
      </div>
      
      <Footer />
    </div>
  );
}

export default GamePage;