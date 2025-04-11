import { useParams, useNavigate } from 'react-router-dom';
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaBrain, FaChevronDown, FaUndo, FaRedo, FaChess, FaExchangeAlt } from 'react-icons/fa';
import { Chess } from 'chess.js';
import axios from 'axios';
import toast from 'react-hot-toast';
import { socketService } from '../services/socket';
import { useAuth } from '../contexts/AuthContext';

import ChessBoard from '../components/game/ChessBoard';
import GameStatus from '../components/game/GameStatus';
import MoveHistoryTable from '../components/game/MoveHistoryTable';
import GameControls from '../components/game/GameControls';
import GameTips from '../components/game/GameTips';

function ChessGame({ mode = 'bot', gameId = null, players = [], gameState = null, onMove = null, playerColor = 'white' }) {
  const params = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Refs for mutable state
  const gameRef = useRef(new Chess());
  const boardRef = useRef(null);
  const boardInstanceRef = useRef(null);
  const moveHistoryRef = useRef([]);
  const gameMoveHistoryRef = useRef([]);
  
  // State for UI updates
  const [status, setStatus] = useState('White to move');
  const [selectedDepth, setSelectedDepth] = useState(3);
  const [isThinking, setIsThinking] = useState(false);
  const [boardOrientation, setBoardOrientation] = useState(playerColor);
  const [showDifficultySelector, setShowDifficultySelector] = useState(false);

  // Use mode from params if not provided as prop
  const gameMode = params?.mode || mode;

  const updateStatus = useCallback((currentGame) => {
    let newStatus = '';
    if (currentGame.isCheckmate()) {
      newStatus = 'Game over - Checkmate!';
    } else if (currentGame.isDraw()) {
      newStatus = 'Game over - Draw!';
    } else {
      newStatus = `${currentGame.turn() === 'w' ? 'White' : 'Black'} to move`;
      if (currentGame.isCheck()) {
        newStatus += ' - Check!';
      }
    }
    setStatus(newStatus);
  }, []);

  // Update board orientation when playerColor changes
  useEffect(() => {
    setBoardOrientation(playerColor);
  }, [playerColor]);

  // Update the gameRef when gameState prop changes
  useEffect(() => {
    if (gameState && gameState.fen) {
      console.log('Updating game with new state:', gameState.fen);
      try {
        const newGame = new Chess();
        newGame.load(gameState.fen);
        gameRef.current = newGame;
        moveHistoryRef.current = newGame.history({ verbose: true });
        updateStatus(newGame);
        
        // If board instance is available, update it
        if (boardInstanceRef.current) {
          boardInstanceRef.current.position(newGame.fen());
        }
      } catch (error) {
        console.error('Error loading game state:', error);
        toast.error('Error loading game state');
      }
    } else if (!gameRef.current.fen()) {
      // If there's no game state provided and our gameRef is empty, initialize a new game
      const newGame = new Chess();
      gameRef.current = newGame;
      moveHistoryRef.current = [];
      gameMoveHistoryRef.current = [];
      updateStatus(newGame);
    }
  }, [gameState, updateStatus]);

  // Socket event handlers
  useEffect(() => {
    if (gameMode === 'online') {
      const handleMoveMade = (moveData) => {
        console.log('Move made event received:', moveData);
        
        try {
          // Check if this is a valid move with required data
          if (!moveData || !moveData.fen) {
            console.error('Invalid move data received:', moveData);
            return;
          }
          
          // Normalize FEN string if needed
          const normalizeFEN = (fen) => {
            // Ensure the FEN is in a format that chess.js can handle
            // Some FEN strings might come in a slightly different format
            try {
              // Split FEN into its components
              const parts = fen.split(' ');
              if (parts.length >= 4) {
                // Check and ensure all parts have proper format
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
          
          // Create a new game with the received FEN position
          const newGame = new Chess();
          const normalizedFEN = normalizeFEN(moveData.fen);
          
          // Try to load the FEN, catch any validation errors
          try {
            if (!newGame.load(normalizedFEN)) {
              throw new Error('Failed to load FEN');
            }
          } catch (fenError) {
            console.error('Invalid FEN position:', normalizedFEN, fenError);
            
            // Fallback: try to reconstruct a game based on from/to data
            if (moveData.from && moveData.to) {
              console.log('Attempting to apply move manually using from/to data');
              
              // Create a fresh game from the last valid position or start position
              const fallbackGame = new Chess(gameRef.current.fen());
              
              try {
                fallbackGame.move({
                  from: moveData.from,
                  to: moveData.to,
                  promotion: 'q' // Default to queen for promotion
                });
                
                // If we get here, the move was applied successfully
                gameRef.current = fallbackGame;
                moveHistoryRef.current = fallbackGame.history({ verbose: true });
                updateStatus(fallbackGame);
                
                // Update the board
                if (boardInstanceRef.current) {
                  boardInstanceRef.current.position(fallbackGame.fen());
                }
                
                // Add to move history
                gameMoveHistoryRef.current = [
                  ...gameMoveHistoryRef.current, 
                  { 
                    from: moveData.from, 
                    to: moveData.to, 
                    fen: fallbackGame.fen() 
                  }
                ];
                
                // Highlight the move
                if (boardInstanceRef.current && boardInstanceRef.current.boardEl) {
                  const sourceSquare = boardInstanceRef.current.boardEl.querySelector(`[data-square="${moveData.from}"]`);
                  if (sourceSquare) sourceSquare.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
                  
                  const targetSquare = boardInstanceRef.current.boardEl.querySelector(`[data-square="${moveData.to}"]`);
                  if (targetSquare) targetSquare.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
                  
                  setTimeout(() => {
                    if (boardInstanceRef.current && boardInstanceRef.current.boardEl) {
                      const squares = boardInstanceRef.current.boardEl.querySelectorAll('[data-square]');
                      squares.forEach(square => {
                        square.style.backgroundColor = '';
                      });
                    }
                  }, 1000);
                }
                
                // Set turn notification
                if (moveData.currentTurn === currentUser?.uid) {
                  toast.success("It's your turn!");
                }
                
                return; // Exit early, we've handled the move manually
              } catch (moveError) {
                console.error('Failed to apply move manually:', moveError);
                // Continue with normal flow, we'll try to recover
              }
            }
            
            // If we couldn't apply the move, at least notify the user of the error
            toast.error('Error processing move from server');
            return;
          }
          
          // If we get here, FEN was loaded successfully
          gameRef.current = newGame;
          moveHistoryRef.current = newGame.history({ verbose: true });
          
          // If we have from/to data, add to move history
          if (moveData.from && moveData.to) {
            gameMoveHistoryRef.current = [
              ...gameMoveHistoryRef.current, 
              { 
                from: moveData.from, 
                to: moveData.to, 
                fen: newGame.fen() 
              }
            ];
          }
          
          // Update game status
          updateStatus(newGame);
          
          // Update board position
          if (boardInstanceRef.current) {
            boardInstanceRef.current.position(newGame.fen());
            
            // Highlight the move on the board
            if (moveData.from && moveData.to && boardInstanceRef.current.boardEl) {
              // Highlight source square
              const sourceSquare = boardInstanceRef.current.boardEl.querySelector(`[data-square="${moveData.from}"]`);
              if (sourceSquare) sourceSquare.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
              
              // Highlight target square
              const targetSquare = boardInstanceRef.current.boardEl.querySelector(`[data-square="${moveData.to}"]`);
              if (targetSquare) targetSquare.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
              
              // Clear highlights after a delay
              setTimeout(() => {
                if (boardInstanceRef.current && boardInstanceRef.current.boardEl) {
                  const squares = boardInstanceRef.current.boardEl.querySelectorAll('[data-square]');
                  squares.forEach(square => {
                    square.style.backgroundColor = '';
                  });
                }
              }, 1000);
            }
          }

          // Notify player if it's their turn
          if (moveData.currentTurn === currentUser?.uid) {
          toast.success("It's your turn!");
          }
        } catch (error) {
          console.error('Error processing move:', error);
          toast.error('Error processing move from server');
        }
      };

      const handleGameOver = ({ winner, reason }) => {
        let message = 'Game Over - ';
        if (reason === 'checkmate') {
          message += winner === currentUser?.uid ? 'You won by checkmate!' : 'You lost by checkmate!';
        } else {
          message += reason === 'draw' ? 'Draw!' : 'Game ended!';
        }
        toast(message, { duration: 5000 });
      };

      const handlePlayerLeft = ({ userId }) => {
        if (userId !== currentUser?.uid) {
          toast.error('Opponent has left the game');
          setTimeout(() => navigate('/'), 3000);
        }
      };

      socketService.onMoveMade(handleMoveMade);
      socketService.onGameOver(handleGameOver);
      socketService.onPlayerLeft(handlePlayerLeft);

      return () => {
        socketService.onMoveMade(null);
        socketService.onGameOver(null);
        socketService.onPlayerLeft(null);
      };
    }
  }, [gameMode, currentUser?.uid, navigate, updateStatus]);

  const makeMove = useCallback(async (from, to) => {
    try {
      const newGame = new Chess(gameRef.current.fen());
      
      // Validate move before attempting it
      const move = newGame.move({
        from,
        to,
        promotion: 'q'
      });

      if (!move) {
        toast.error('Invalid move');
        return false;
      }

        if (gameMode === 'online') {
          await socketService.makeMove(gameId, currentUser?.uid, { from, to });
        }

      gameMoveHistoryRef.current = [...gameMoveHistoryRef.current, { from, to, fen: newGame.fen() }];
      gameRef.current = newGame;
      moveHistoryRef.current = newGame.history({ verbose: true });
        updateStatus(newGame);

      // Only try to highlight if the board is initialized and the move was valid
      if (boardInstanceRef.current && boardInstanceRef.current.boardEl) {
        boardInstanceRef.current.position(newGame.fen());
        const squareEl = boardInstanceRef.current.boardEl.querySelector(`[data-square="${from}"]`);
        if (squareEl) squareEl.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
        const targetEl = boardInstanceRef.current.boardEl.querySelector(`[data-square="${to}"]`);
        if (targetEl) targetEl.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
        
        setTimeout(() => {
          if (boardInstanceRef.current && boardInstanceRef.current.boardEl) {
            const squares = boardInstanceRef.current.boardEl.querySelectorAll('[data-square]');
            squares.forEach(square => {
              square.style.backgroundColor = '';
            });
          }
        }, 1000);
      }

      return true;
    } catch (e) {
      console.error('Move error:', e);
      toast.error('Failed to make move');
    }
    return false;
  }, [gameMode, gameId, currentUser?.uid, updateStatus]);

  const getBotMove = async (fen, depth) => {
    try {
      console.log('Making bot move API call...');
      const response = await axios.post('http://localhost:3002/api/bot-move', {
        fen,
        depth
      });
      
      if (response.data && response.data.move) {
        return response.data.move;
      } else {
        console.error('Invalid response from bot API:', response.data);
        toast.error('Error getting bot move: Invalid response');
        return null;
      }
    } catch (error) {
      console.error('Error getting bot move:', error);
      toast.error('Error getting bot move. Please try again.');
      return null;
    }
  };

  const handleBotMove = useCallback(async () => {
    if (gameMode === 'bot' && !gameRef.current.isGameOver()) {
      try {
        setIsThinking(true);
        const botMove = await getBotMove(gameRef.current.fen(), selectedDepth);
        
        if (botMove?.length >= 4) {
          const from = botMove.substring(0, 2);
          const to = botMove.substring(2, 4);
          await makeMove(from, to);
        }
      } catch (error) {
        console.error('Bot move error:', error);
        // Don't show another toast here since getBotMove already shows one
      } finally {
        setIsThinking(false);
      }
    }
  }, [gameMode, selectedDepth, makeMove]);

  const handleMove = useCallback(async (sourceSquare, targetSquare) => {
    if (gameMode === 'online') {
      const isWhiteTurn = gameRef.current.turn() === 'w';
      const isPlayerTurn = (playerColor === 'white' && isWhiteTurn) || 
                          (playerColor === 'black' && !isWhiteTurn);
      
      if (!isPlayerTurn) {
        toast.error("It's not your turn!");
        return false;
      }
    } else if (gameMode === 'bot' && gameRef.current.turn() !== boardOrientation[0]) {
      return false;
    }
    
    if (isThinking) {
      return false;
    }
    
    try {
      // Make sure we're working with the latest game state
      console.log('Current FEN:', gameRef.current.fen());
      console.log('Making move from', sourceSquare, 'to', targetSquare);
      
      // Try to make the move
      const move = gameRef.current.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });
      
      if (!move) {
        console.error('Invalid move:', { from: sourceSquare, to: targetSquare, promotion: 'q' });
        toast.error('Invalid move');
        return false;
      }
      
      // Move is valid locally, update the state
      moveHistoryRef.current = gameRef.current.history({ verbose: true });
      gameMoveHistoryRef.current = [...gameMoveHistoryRef.current, { from: sourceSquare, to: targetSquare, fen: gameRef.current.fen() }];
      updateStatus(gameRef.current);
      
      // For online games, send the move to the server
      if (gameMode === 'online' && onMove) {
        try {
          await onMove({ from: sourceSquare, to: targetSquare });
        } catch (error) {
          // If server rejects the move, revert the local change
          console.error('Server rejected move:', error);
          gameRef.current.undo();
          moveHistoryRef.current = gameRef.current.history({ verbose: true });
          gameMoveHistoryRef.current.pop();
          updateStatus(gameRef.current);
          toast.error('Server rejected move');
          return false;
        }
      }
      
      // For bot games, make the bot's response move
      if (gameMode === 'bot') {
      setTimeout(() => {
        handleBotMove();
      }, 500);
    }
    
      // Highlight the move on the board
      if (boardInstanceRef.current && boardInstanceRef.current.boardEl) {
        boardInstanceRef.current.position(gameRef.current.fen());
        const squareEl = boardInstanceRef.current.boardEl.querySelector(`[data-square="${sourceSquare}"]`);
        if (squareEl) squareEl.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
        const targetEl = boardInstanceRef.current.boardEl.querySelector(`[data-square="${targetSquare}"]`);
        if (targetEl) targetEl.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
        
        setTimeout(() => {
          if (boardInstanceRef.current && boardInstanceRef.current.boardEl) {
            const squares = boardInstanceRef.current.boardEl.querySelectorAll('[data-square]');
            squares.forEach(square => {
              square.style.backgroundColor = '';
            });
          }
        }, 1000);
      }
      
      return true;
    } catch (error) {
      console.error('Move error:', error);
      toast.error(error.message || 'Failed to make move');
      return false;
    }
  }, [makeMove, gameMode, boardOrientation, handleBotMove, isThinking, playerColor, onMove, updateStatus]);

  const handleNewGame = useCallback(() => {
    const newGame = new Chess();
    gameRef.current = newGame;
    moveHistoryRef.current = [];
    gameMoveHistoryRef.current = [];
    updateStatus(newGame);
    if (boardInstanceRef.current) {
      boardInstanceRef.current.position(newGame.fen());
    }
  }, [updateStatus]);

  const handleUndo = useCallback(() => {
    if (gameMoveHistoryRef.current.length === 0) return;
    
    const newGame = new Chess();
    const newHistory = [...gameMoveHistoryRef.current];
    newHistory.pop();
    
    for (const move of newHistory) {
      newGame.move({ from: move.from, to: move.to, promotion: 'q' });
    }
    
    gameRef.current = newGame;
    gameMoveHistoryRef.current = newHistory;
    moveHistoryRef.current = newGame.history({ verbose: true });
    updateStatus(newGame);
    if (boardInstanceRef.current) {
      boardInstanceRef.current.position(newGame.fen());
    }
  }, [updateStatus]);

  const handleFlipBoard = useCallback(() => {
    console.log('Flipping board from', boardOrientation, 'to', boardOrientation === 'white' ? 'black' : 'white');
    setBoardOrientation(prev => prev === 'white' ? 'black' : 'white');
  }, []);

  const handleBackToModes = useCallback(() => {
    if (gameMode === 'online') {
      socketService.disconnect(); // Clean up socket connection
    }
    navigate('/');
  }, [gameMode, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4">
        {/* Back button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleBackToModes}
          className="mb-8 flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
      >
        <FaArrowLeft />
        <span>Back to Game Modes</span>
      </motion.button>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 lg:gap-8">
          {/* Left column - Game info */}
          <motion.div 
            className="md:col-span-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="bg-white rounded-xl shadow-lg p-6 mb-4"
              whileHover={{ boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Game Status</h2>
              <GameStatus
                isCheck={gameRef.current.isCheck()}
                isCheckmate={gameRef.current.isCheckmate()}
                isStalemate={gameRef.current.isStalemate()}
                currentTurn={gameRef.current.turn() === 'w' ? 'white' : 'black'}
                playerColor={playerColor}
              />
            </motion.div>
            
            <motion.div 
              className="bg-white rounded-xl shadow-lg p-6"
              whileHover={{ boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Move History</h2>
              <MoveHistoryTable moves={moveHistoryRef.current} />
            </motion.div>
          </motion.div>

          {/* Center column - Chess board */}
          <motion.div 
            className="md:col-span-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <motion.div 
              className="bg-white rounded-xl shadow-lg p-6 relative"
              whileHover={{ boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
            >
              {isThinking && (
                <motion.div 
                  className="absolute inset-0 bg-black bg-opacity-10 rounded-xl flex items-center justify-center z-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div 
                    className="bg-white p-4 rounded-lg shadow-xl flex items-center gap-3"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.8 }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <FaChess className="text-indigo-600 text-xl" />
                    </motion.div>
                    <span className="font-medium">Bot is thinking...</span>
                  </motion.div>
                </motion.div>
              )}
            <ChessBoard
                position={gameRef.current.fen()}
              onMove={handleMove}
              orientation={boardOrientation}
              isThinking={isThinking}
                game={gameRef.current}
              />
            </motion.div>
          </motion.div>

          {/* Right column - Controls and tips */}
          <motion.div 
            className="md:col-span-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <motion.div 
              className="bg-white rounded-xl shadow-lg p-6 mb-4"
              whileHover={{ boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Game Controls</h2>
            <GameControls
              onNewGame={handleNewGame}
                onUndoMove={handleUndo}
              onFlipBoard={handleFlipBoard}
                gameMode={gameMode}
              selectedDepth={selectedDepth}
              onDepthChange={setSelectedDepth}
                boardOrientation={boardOrientation}
            />
            </motion.div>

            <motion.div 
              className="bg-white rounded-xl shadow-lg p-6"
              whileHover={{ boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Game Tips</h2>
          <GameTips isBotMode={gameMode === 'bot'} />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default ChessGame;