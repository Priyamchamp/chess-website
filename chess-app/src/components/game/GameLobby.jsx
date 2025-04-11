import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaCopy, FaUserPlus } from 'react-icons/fa';
import useGameStore from '../../stores/gameStore';
import { socketService } from '../../services/socket';
import toast from 'react-hot-toast';

function GameLobby({ userId }) {
  const [inputGameCode, setInputGameCode] = useState('');
  const [copied, setCopied] = useState(false);
  const { gameId, players, initializeGame, joinGame } = useGameStore();

  useEffect(() => {
    const handleGameCreated = ({ gameId }) => {
      toast.success('Game room created!');
      // Update the game store instead of local state
      useGameStore.getState().setGameId(gameId);
      toast.dismiss('create-game');
    };

    const handleGameJoined = ({ players }) => {
      useGameStore.getState().setPlayers(players);
      toast.success('Joined game room!');
      toast.dismiss('join-game');
    };

    // Set up socket listeners
    socketService.onGameCreated(handleGameCreated);
    socketService.onGameJoined(handleGameJoined);

    // Cleanup function
    return () => {
      socketService.onGameCreated(null);
      socketService.onGameJoined(null);
    };
  }, []);

  const handleCreateGame = () => {
    if (!socketService.isConnected()) {
      socketService.connect();
    }
    initializeGame(userId);
    toast.loading('Creating game room...', { id: 'create-game' });
  };

  const handleJoinGame = () => {
    if (!inputGameCode.trim()) {
      toast.error('Please enter a game code');
      return;
    }

    if (!socketService.isConnected()) {
      socketService.connect();
    }
    joinGame(inputGameCode, userId);
    toast.loading('Joining game room...', { id: 'join-game' });
  };

  const copyGameCode = () => {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    toast.success('Game code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4"
    >
      <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Chess Game Lobby</h2>

      <div className="space-y-6">
        <div className="text-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCreateGame}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Create New Game
          </motion.button>
        </div>

        {gameId && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Share this code with your opponent:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white px-4 py-2 rounded border text-gray-800">
                {gameId}
              </code>
              <button
                onClick={copyGameCode}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Copy game code"
              >
                <FaCopy />
              </button>
            </div>
            {copied && (
              <p className="text-sm text-green-600 mt-1">Copied to clipboard!</p>
            )}
          </div>
        )}

        <div className="space-y-3">
          <p className="text-center text-gray-600">- OR -</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputGameCode}
              onChange={(e) => setInputGameCode(e.target.value)}
              placeholder="Enter game code"
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleJoinGame}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-green-700 transition-colors"
            >
              <FaUserPlus />
              Join
            </motion.button>
          </div>
        </div>

        {players.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-2 text-gray-800">Players:</h3>
            <ul className="space-y-2">
              {players.map((player, index) => (
                <li
                  key={player}
                  className="flex items-center gap-2 bg-gray-50 p-2 rounded"
                >
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-gray-700">
                    {player === userId ? 'You' : `Player ${index + 1}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default GameLobby;