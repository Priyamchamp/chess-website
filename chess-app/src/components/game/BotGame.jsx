import React, { useState, useEffect, useCallback } from 'react';
import ChessBoard from './ChessBoard';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import chessEngine from '../../services/ChessEngine';
import { Chess } from 'chess.js';
import { FaRobot, FaCog, FaInfo, FaArrowLeft } from 'react-icons/fa';
import './BotGame.css';

const BotGame = ({ onBack }) => {
  const [fen, setFen] = useState('start');
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameStatus, setGameStatus] = useState({ isGameOver: false, result: '' });
  const [difficultyLevel, setDifficultyLevel] = useState(2); // Default medium
  const [isThinking, setIsThinking] = useState(false);
  const [chess] = useState(new Chess());
  const [showSettings, setShowSettings] = useState(false);
  const [lastMove, setLastMove] = useState(null);
  const [playerColor, setPlayerColor] = useState('WHITE');
  const [moveHistory, setMoveHistory] = useState([]);
  
  // Initialize or reset the game
  const resetGame = useCallback(() => {
    chess.reset();
    setFen(chess.fen());
    setIsPlayerTurn(playerColor === 'WHITE');
    setGameStatus({ isGameOver: false, result: '' });
    setMoveHistory([]);
    setLastMove(null);
    toast.success('New game started!');
  }, [chess, playerColor]);
  
  // Initial setup
  useEffect(() => {
    resetGame();
  }, [resetGame]);
  
  // Make the bot move
  useEffect(() => {
    const makeComputerMove = async () => {
      if (gameStatus.isGameOver || isPlayerTurn) return;
      
      try {
        setIsThinking(true);
        
        // Small delay to show the bot "thinking"
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Calculate time and depth based on difficulty
        const thinkTime = difficultyLevel * 0.5;
        const searchDepth = difficultyLevel + 1;
        
        // Get best move from chess engine
        const bestMove = chessEngine.getBestMove(chess.fen(), searchDepth, thinkTime);
        
        // Make the move if valid
        if (bestMove) {
          const move = chess.move(bestMove);
          if (move) {
            setLastMove({ from: move.from, to: move.to });
            setFen(chess.fen());
            setMoveHistory(prevHistory => [...prevHistory, move]);
            
            // Check game status
            updateGameStatus();
            
            // Switch turn
            setIsPlayerTurn(true);
          }
        }
      } catch (error) {
        console.error('Bot move error:', error);
        toast.error('Bot encountered an error making a move');
      } finally {
        setIsThinking(false);
      }
    };
    
    // Small delay before bot starts "thinking"
    const timer = setTimeout(() => {
      makeComputerMove();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [isPlayerTurn, gameStatus.isGameOver, chess, difficultyLevel]);
  
  // Handle player moves
  const handlePlayerMove = useCallback((move) => {
    if (gameStatus.isGameOver || !isPlayerTurn || isThinking) return false;
    
    try {
      // Make the move
      const result = chess.move(move);
      if (result) {
        setLastMove({ from: result.from, to: result.to });
        setFen(chess.fen());
        setMoveHistory(prevHistory => [...prevHistory, result]);
        
        // Check game status
        updateGameStatus();
        
        // Switch turn
        setIsPlayerTurn(false);
        return true;
      }
    } catch (error) {
      console.error('Invalid move:', error);
    }
    return false;
  }, [chess, gameStatus.isGameOver, isPlayerTurn, isThinking]);
  
  // Update game status (checkmate, draw, etc.)
  const updateGameStatus = useCallback(() => {
    let status = { isGameOver: false, result: '' };
    
    if (chess.isCheckmate()) {
      status = { 
        isGameOver: true, 
        result: `Checkmate! ${chess.turn() === 'w' ? 'Black' : 'White'} wins!` 
      };
      toast.success(status.result);
    } else if (chess.isDraw()) {
      let reason = 'Draw';
      if (chess.isStalemate()) {
        reason = 'Draw by stalemate';
      } else if (chess.isThreefoldRepetition()) {
        reason = 'Draw by repetition';
      } else if (chess.isInsufficientMaterial()) {
        reason = 'Draw by insufficient material';
      }
      status = { isGameOver: true, result: reason };
      toast.info(status.result);
    } else if (chess.isCheck()) {
      toast.info('Check!');
    }
    
    setGameStatus(status);
  }, [chess]);
  
  // Handle difficulty change
  const handleDifficultyChange = (level) => {
    setDifficultyLevel(level);
    const difficulties = ['Easy', 'Medium', 'Hard', 'Expert', 'Master'];
    toast.success(`Difficulty set to ${difficulties[level - 1]}`);
  };
  
  // Handle color change
  const handleColorChange = (color) => {
    if (moveHistory.length > 0) {
      const confirmChange = window.confirm('Changing color will reset the game. Continue?');
      if (!confirmChange) return;
    }
    
    setPlayerColor(color);
    setTimeout(resetGame, 0);
  };
  
  // UI for difficulty selection
  const renderDifficultySelector = () => {
    return (
      <motion.div 
        className="difficulty-selector"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
      >
        <h3>Difficulty Level</h3>
        <div className="difficulty-buttons">
          {[1, 2, 3, 4, 5].map(level => (
            <motion.button
              key={level}
              className={`difficulty-button ${difficultyLevel === level ? 'active' : ''}`}
              onClick={() => handleDifficultyChange(level)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {level === 1 && 'Easy'}
              {level === 2 && 'Medium'}
              {level === 3 && 'Hard'}
              {level === 4 && 'Expert'}
              {level === 5 && 'Master'}
            </motion.button>
          ))}
        </div>
        
        <h3>Play as</h3>
        <div className="color-selector">
          <motion.button
            className={`color-button ${playerColor === 'WHITE' ? 'active' : ''}`}
            onClick={() => handleColorChange('WHITE')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            White
          </motion.button>
          <motion.button
            className={`color-button ${playerColor === 'BLACK' ? 'active' : ''}`}
            onClick={() => handleColorChange('BLACK')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Black
          </motion.button>
        </div>
      </motion.div>
    );
  };
  
  // Render the game controls
  const renderGameControls = () => {
    return (
      <motion.div 
        className="game-controls"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <motion.button 
          className="control-button"
          onClick={resetGame}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={isThinking}
        >
          New Game
        </motion.button>
        
        <motion.button 
          className="control-button settings-button"
          onClick={() => setShowSettings(!showSettings)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FaCog /> Settings
        </motion.button>
        
        <motion.button 
          className="control-button back-button"
          onClick={onBack}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FaArrowLeft /> Back
        </motion.button>
      </motion.div>
    );
  };
  
  // Render the game status
  const renderGameStatus = () => {
    return (
      <motion.div 
        className="game-status"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="status-info">
          {gameStatus.isGameOver ? (
            <div className="game-result">{gameStatus.result}</div>
          ) : (
            <div className="current-turn">
              {isThinking ? (
                <div className="thinking">
                  <FaRobot className="robot-icon" /> Bot is thinking...
                </div>
              ) : (
                <div>
                  {isPlayerTurn ? 'Your turn' : 'Bot\'s turn'}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="difficulty-info">
          <FaInfo /> Level: {
            difficultyLevel === 1 ? 'Easy' :
            difficultyLevel === 2 ? 'Medium' :
            difficultyLevel === 3 ? 'Hard' :
            difficultyLevel === 4 ? 'Expert' : 'Master'
          }
        </div>
      </motion.div>
    );
  };
  
  // Render move history
  const renderMoveHistory = () => {
    const moves = [];
    for (let i = 0; i < moveHistory.length; i += 2) {
      const moveNumber = i / 2 + 1;
      const whiteMove = moveHistory[i];
      const blackMove = moveHistory[i + 1];
      
      moves.push(
        <div key={i} className="move-pair">
          <span className="move-number">{moveNumber}.</span>
          <span className="white-move">{whiteMove.san}</span>
          {blackMove && <span className="black-move">{blackMove.san}</span>}
        </div>
      );
    }
    
    return (
      <motion.div 
        className="move-history"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3>Move History</h3>
        <div className="moves-container">
          {moves.length > 0 ? moves : <div className="no-moves">No moves yet</div>}
        </div>
      </motion.div>
    );
  };
  
  return (
    <div className="bot-game-container">
      <motion.div 
        className="bot-game-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2><FaRobot /> Playing Against Bot</h2>
      </motion.div>
      
      <div className="bot-game-content">
        <div className="bot-game-board">
          <ChessBoard 
            position={fen}
            onMove={handlePlayerMove}
            playerColor={playerColor}
            lastMove={lastMove}
            isThinking={isThinking}
          />
          {renderGameStatus()}
        </div>
        
        <div className="bot-game-sidebar">
          {renderGameControls()}
          {showSettings && renderDifficultySelector()}
          {renderMoveHistory()}
        </div>
      </div>
    </div>
  );
};

export default BotGame; 