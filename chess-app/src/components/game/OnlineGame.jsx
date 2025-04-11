import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socketService } from '../../services/socket';
import { useAuth } from '../../contexts/AuthContext';
import ChessGame from '../../pages/ChessGame';
import toast from 'react-hot-toast';
import { FaCopy, FaArrowLeft } from 'react-icons/fa';
import { Chess } from 'chess.js';
import { useNavigate } from 'react-router-dom';

function OnlineGame() {
  const { currentUser } = useAuth();
  const [gameMode, setGameMode] = useState('select');
  const [gameId, setGameId] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [queuePosition, setQueuePosition] = useState(null);
  const [estimatedWaitTime, setEstimatedWaitTime] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [lastMoveTimestamp, setLastMoveTimestamp] = useState(0);
  const [playerColor, setPlayerColor] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const persistedGameMode = sessionStorage.getItem('gameMode');
    if (persistedGameMode) {
      setGameMode(persistedGameMode);
    }

    // Ensure we're connected to the socket server
    if (!socketService.isConnected()) {
      console.log('Connecting to socket server...');
      socketService.connect().catch(error => {
        console.error('Failed to connect to socket server:', error);
        toast.error('Failed to connect to game server. Please try again.');
      });
    }

    // Handler for game state updates - crucial for displaying the chess board
    const handleGameStateUpdate = (newState) => {
      console.log('Game state update received:', newState);
      if (!newState) {
        console.error('Received empty game state');
        return;
      }
      
      if (newState.timestamp > lastMoveTimestamp || !lastMoveTimestamp) {
        console.log('Setting new game state with FEN:', newState.fen);
        setGameState(newState);
        setLastMoveTimestamp(newState.timestamp || Date.now());
        
        // If we receive a game state but aren't in playing mode, switch to it
        if (gameMode !== 'playing') {
          console.log('Switching to playing mode due to game state update');
          setGameMode('playing');
          setIsTransitioning(false);
        }
      }
    };

    const handleMoveSync = (moveData) => {
      console.log('Move sync received:', moveData);
      
      if (!moveData) {
        console.error('Received empty move data');
        return;
      }

      // Normalize FEN string if needed
      const normalizeFEN = (fen) => {
        if (!fen) return null;
        
        try {
          // Split FEN into its components
          const parts = fen.split(' ');
          if (parts.length >= 4) {
            return fen; // If it has enough parts, should be valid
          } else {
            // Add missing parts to the FEN if needed
            console.warn('Incomplete FEN, attempting to normalize:', fen);
            const position = parts[0] || '';
            const turn = parts[1] || 'w';
            const castling = parts[2] || 'KQkq';
            const enPassant = parts[3] || '-';
            const halfMoves = parts[4] || '0';
            const fullMoves = parts[5] || '1';
            return `${position} ${turn} ${castling} ${enPassant} ${halfMoves} ${fullMoves}`;
          }
        } catch (error) {
          console.error('Error normalizing FEN:', error);
          return fen; // Return original if normalization fails
        }
      };

      try {
        // Always update with the latest move data
        const timestamp = moveData.timestamp || Date.now();
        
        // Validate FEN before updating state
        let updatedFen = moveData.fen;
        
        if (updatedFen) {
          // Try to validate the FEN using Chess.js
          try {
            const tempGame = new Chess();
            const normalizedFEN = normalizeFEN(updatedFen);
            
            if (!tempGame.load(normalizedFEN)) {
              console.error('Invalid FEN in move sync, using last known valid position');
              
              // If we have a last known good state, use that FEN instead
              if (gameState && gameState.fen) {
                updatedFen = gameState.fen;
              } else {
                // If all else fails, use the starting position
                updatedFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
              }
            } else {
              // If the FEN loaded correctly, use the properly formatted FEN from chess.js
              updatedFen = tempGame.fen();
            }
          } catch (fenError) {
            console.error('Error validating FEN:', fenError);
            // Keep original FEN, we'll try to use it anyway
          }
        }
        
        // Force update regardless of timestamp to ensure move synchronization
        setGameState(prevState => ({
          ...prevState,
          fen: updatedFen,
          currentTurn: moveData.currentTurn,
          lastMove: moveData.lastMove || { from: moveData.from, to: moveData.to },
          isCheck: moveData.is_check,
          isCheckmate: moveData.is_checkmate,
          isStalemate: moveData.is_stalemate,
          isGameOver: moveData.is_game_over,
          timestamp: timestamp
        }));
        
        setLastMoveTimestamp(timestamp);
        
        console.log('Updated game state with move:', moveData.from, moveData.to);
      } catch (error) {
        console.error('Error processing move sync:', error);
      }
    };

    const handleColorAssigned = ({ color, gameId }) => {
      console.log('Color assigned:', { color, gameId });
      setPlayerColor(color);
      toast.success(`You are playing as ${color}`);
    };

    const handleGameStarted = ({ players, currentTurn }) => {
      console.log('Game started:', { players, currentTurn });
      setPlayers(players);
      setGameMode('playing');
      setIsTransitioning(false);
      
      // Initialize a basic game state if none exists yet
      if (!gameState) {
        setGameState({
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Starting position
          players: players,
          currentTurn: currentTurn,
          timestamp: Date.now()
        });
      }
      
      toast.success('Game started!');
    };

    // Handler for when a match is found
    const handleMatchFound = ({ gameId, opponent, color }) => {
      console.log('Match found event received:', { gameId, opponent, color });
      
      // Set game ID and color
      setGameId(gameId);
      setPlayerColor(color);
      
      // Set player order based on color
      setPlayers(color === 'white' ? [currentUser.uid, opponent] : [opponent, currentUser.uid]);
      
      // Switch to playing mode
      setGameMode('playing');
      setIsTransitioning(false);
      
      // Save game ID in session storage for recovery
      sessionStorage.setItem('currentGameId', gameId);
      sessionStorage.setItem('playerColor', color);
      
      // Notify the user
      toast.success(`Match found! You are playing as ${color}`);
    };

    // Register event listeners
    socketService.onGameStateUpdate(handleGameStateUpdate);
    socketService.onMoveSync(handleMoveSync);
    socketService.onColorAssigned(handleColorAssigned);
    socketService.onGameStarted(handleGameStarted);
    socketService.onMatchFound(handleMatchFound);
    
    // Recover session if we have a game ID in sessionStorage
    const savedGameId = sessionStorage.getItem('currentGameId');
    const savedColor = sessionStorage.getItem('playerColor');
    if (savedGameId && savedColor && gameMode !== 'playing') {
      console.log('Recovering game session:', savedGameId, savedColor);
      setGameId(savedGameId);
      setPlayerColor(savedColor);
      setGameMode('playing');
    }

    socketService.onGameCreated(({ gameId }) => {
      console.log('Game created with ID:', gameId);
      setGameId(gameId);
      setGameMode('create');
      setIsTransitioning(false);
      toast.success('Game created! Share the code with your opponent.');
    });

    socketService.onQueueUpdate(({ position, estimatedWaitTime }) => {
      setQueuePosition(position);
      setEstimatedWaitTime(estimatedWaitTime);
    });

    // Clean up
    return () => {
      socketService.disconnect();
      sessionStorage.removeItem('gameMode');
      socketService.onGameStateUpdate(null);
      socketService.onMoveSync(null);
      socketService.onColorAssigned(null);
      socketService.onGameStarted(null);
      socketService.onMatchFound(null);
    };
  }, [currentUser, lastMoveTimestamp, gameMode]);

  const handleMove = useCallback(async (move) => {
    try {
      console.log('Attempting move:', move);
      
      // Ensure we have all required data
      if (!gameId || !currentUser || !move || !move.from || !move.to) {
        console.error('Missing required move data:', { gameId, userId: currentUser?.uid, move });
        toast.error('Missing required move data');
        return false;
      }
      
      // Check if socket is connected before attempting the move
      if (!socketService.isConnected()) {
        await socketService.connect();
      }
      
      // Add the userId to make sure server can validate the correct player
      const moveData = {
        ...move,
        game_id: gameId,
        user_id: currentUser.uid,
        timestamp: Date.now()
      };
      
      console.log('Sending move to server:', moveData);
      
      // Attempt to make the move on the server
      const result = await socketService.makeMove(gameId, currentUser.uid, moveData);
      
      if (!result || result.error) {
        console.error('Move error:', result?.error || 'Failed to make move');
        toast.error(result?.error || 'Failed to make move');
        return false;
      }
      
      console.log('Move successful:', result);
      return true;
    } catch (error) {
      console.error('Move error:', error);
      toast.error(error.message || 'Failed to make move');
      return false;
    }
  }, [gameId, currentUser]);

  const updateGameMode = (newMode) => {
    setGameMode(newMode);
    sessionStorage.setItem('gameMode', newMode);
  };

  const handleStartMatchmaking = () => {
    if (!currentUser) return;
    
    setIsTransitioning(true);
    setGameMode('matchmaking');
    
    // Make sure socket is connected before joining matchmaking
    if (!socketService.isConnected()) {
      socketService.connect()
        .then(() => {
          console.log('Socket connected, joining matchmaking...');
          socketService.joinMatchmaking(currentUser.uid)
            .catch(error => {
              console.error('Error joining matchmaking:', error);
              toast.error('Error joining matchmaking. Please try again.');
              setGameMode('select');
              setIsTransitioning(false);
            });
        })
        .catch(error => {
          console.error('Failed to connect to socket server:', error);
          toast.error('Failed to connect to game server. Please try again.');
          setGameMode('select');
          setIsTransitioning(false);
        });
    } else {
      // Socket already connected
      console.log('Socket already connected, joining matchmaking...');
      socketService.joinMatchmaking(currentUser.uid)
        .catch(error => {
          console.error('Error joining matchmaking:', error);
          toast.error('Error joining matchmaking. Please try again.');
          setGameMode('select');
          setIsTransitioning(false);
        });
    }
  };

  const handleCancelMatchmaking = () => {
    if (!currentUser) return;
    socketService.leaveMatchmaking(currentUser.uid);
    setGameMode('select');
    setIsTransitioning(false);
    setQueuePosition(null);
    setEstimatedWaitTime(null);
  };

  const handleCreateGame = () => {
    if (!currentUser) return;
    setIsTransitioning(true);
    socketService.createGame(currentUser.uid);
    updateGameMode('create');
  };

  const handleJoinGame = async () => {
    if (!joinCode.trim() || !currentUser) {
      toast.error('Please enter a valid game code');
      return;
    }
    
    setIsTransitioning(true);
    try {
      const response = await socketService.joinGame(joinCode.trim(), currentUser.uid);
      console.log('Join game successful:', response);
      
      if (response && response.gameId) {
        setGameId(response.gameId);
        if (response.players) {
          setPlayers(response.players);
        }
        // Wait for color assignment and game start events
        toast.success('Successfully joined game!');
      } else {
        throw new Error('Invalid game response');
      }
    } catch (error) {
      console.error('Failed to join game:', error);
      toast.error(error.message || 'Failed to join game');
      setIsTransitioning(false);
      setJoinCode('');
    }
  };

  const handleCopyGameId = async () => {
    if (!gameId) {
      toast.error('No game code available');
      return;
    }

    try {
      await navigator.clipboard.writeText(gameId);
      setIsCopied(true);
      toast.success('Game code copied to clipboard!');
      
      // Reset copy state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback copy method
      const textArea = document.createElement('textarea');
      textArea.value = gameId;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setIsCopied(true);
        toast.success('Game code copied to clipboard!');
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      } catch (e) {
        console.error('Fallback copy failed:', e);
        toast.error('Failed to copy game code');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleBackToModes = () => {
    socketService.disconnect(); // Clean up socket connection
    navigate('/');
  };

  const renderSelectMode = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-md w-full mx-auto bg-white p-8 rounded-xl shadow-lg"
    >
      <h2 className="text-2xl font-bold text-center mb-8">Play Online Chess</h2>
      <div className="space-y-4">
        <button
          onClick={handleStartMatchmaking}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Find Random Opponent
        </button>
        <div className="text-center text-gray-500">- OR -</div>
        <button
          onClick={handleCreateGame}
          className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
        >
          Create Private Game
        </button>
        <button
          onClick={() => updateGameMode('join')}
          className="w-full py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
        >
          Join Private Game
        </button>
      </div>
    </motion.div>
  );

  const renderMatchmaking = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-md w-full mx-auto bg-white p-8 rounded-xl shadow-lg"
    >
      <h2 className="text-2xl font-bold text-center mb-6">Finding Opponent...</h2>
      <div className="flex justify-center mb-6">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
      
      <div className="text-center mb-6">
        <p className="text-gray-600 font-medium mb-2">
          Connecting you with a player of similar skill level
        </p>
        {queuePosition && (
          <div className="bg-blue-50 p-4 rounded-lg my-4">
            <p className="text-gray-700 font-medium">Position in queue: {queuePosition}</p>
            {estimatedWaitTime && (
              <p className="text-gray-600">
                Estimated wait: {Math.round(estimatedWaitTime / 60)}:{(estimatedWaitTime % 60).toString().padStart(2, '0')}
              </p>
            )}
          </div>
        )}
        <p className="text-sm text-gray-500 mt-2">
          Please wait while we find you an opponent.<br />
          This may take a few moments.
        </p>
      </div>

      <button
        onClick={handleCancelMatchmaking}
        className="w-full py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
      >
        Cancel Search
      </button>
    </motion.div>
  );

  const renderCreateGame = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-md w-full mx-auto bg-white p-8 rounded-xl shadow-lg"
    >
      <h2 className="text-2xl font-bold text-center mb-6">Game Created!</h2>
      {gameId ? (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <p className="text-sm text-gray-600 mb-2">Share this code with your opponent:</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white px-4 py-2 rounded border text-lg font-mono overflow-x-auto">
              {gameId}
            </div>
            <button
              onClick={handleCopyGameId}
              className={`p-3 rounded transition-colors ${
                isCopied 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              }`}
              title="Copy game code"
            >
              <FaCopy className="w-5 h-5" />
            </button>
          </div>
          {isCopied && (
            <p className="text-sm text-green-600 mt-2">
              Copied to clipboard!
            </p>
          )}
        </div>
      ) : (
        <div className="flex justify-center mb-6">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      <p className="text-center text-gray-600">
        {gameId ? 'Waiting for opponent to join...' : 'Creating game...'}
      </p>
      <button
        onClick={() => updateGameMode('select')}
        className="w-full mt-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        Back to Game Modes
      </button>
    </motion.div>
  );

  const renderJoinGame = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-md w-full mx-auto bg-white p-8 rounded-xl shadow-lg"
    >
      <h2 className="text-2xl font-bold text-center mb-6">Join Game</h2>
      <div className="space-y-4">
        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="Enter game code"
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <button
          onClick={handleJoinGame}
          className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
        >
          Join Game
        </button>
        <button
          onClick={() => updateGameMode('select')}
          className="w-full py-2 text-gray-600 hover:text-gray-800"
        >
          Back
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4">
        {/* Back button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleBackToModes}
          className="mb-8 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <FaArrowLeft />
          <span>Back to Game Modes</span>
        </motion.button>

        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Play Online Chess
          </h1>
        </div>

        <AnimatePresence mode="wait">
          {gameMode === 'playing' ? (
            <>
              {console.log('Rendering ChessGame component with:', { 
                gameId, 
                players, 
                gameState,
                playerColor 
              })}
              <ChessGame 
                mode="online" 
                gameId={gameId} 
                players={players}
                gameState={gameState}
                onMove={handleMove}
                playerColor={playerColor}
              />
            </>
          ) : (
            <>
              {console.log('Current game mode:', gameMode)}
              {gameMode === 'select' && renderSelectMode()}
              {gameMode === 'matchmaking' && renderMatchmaking()}
              {gameMode === 'create' && renderCreateGame()}
              {gameMode === 'join' && renderJoinGame()}
            </>
          )}
        </AnimatePresence>
        
        {isTransitioning && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-white"></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OnlineGame;