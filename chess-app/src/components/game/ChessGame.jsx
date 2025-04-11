import React, { useCallback, useState, useEffect } from 'react';
import Chess from 'chess.js';
import ChessBoard from './ChessBoard';
import GameStatus from './GameStatus';
import MoveHistoryTable from './MoveHistoryTable';
import GameControls from './GameControls';
import GameTips from './GameTips';

const ChessGame = ({ mode = 'bot', gameId = null, players = [], gameState = null, onMove = null, playerColor = 'white' }) => {
  const [game, setGame] = useState(new Chess());
  const [isThinking, setIsThinking] = useState(false);
  const [status, setStatus] = useState('White to move');
  const [selectedDepth, setSelectedDepth] = useState(3);
  const [boardOrientation, setBoardOrientation] = useState(playerColor);
  const [moveHistory, setMoveHistory] = useState([]);

  // Update board orientation when playerColor changes
  useEffect(() => {
    setBoardOrientation(playerColor);
  }, [playerColor]);

  // Update game state when gameState prop changes
  useEffect(() => {
    if (gameState) {
      const newGame = new Chess();
      newGame.load(gameState.fen);
      setGame(newGame);
      setMoveHistory(newGame.history({ verbose: true }));
      updateStatus(newGame);
    }
  }, [gameState]);

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

  const makeMove = useCallback((from, to) => {
    if (!game || isThinking) return false;
    
    try {
      // Create a copy of the game to validate the move
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from,
        to,
        promotion: 'q' // Always promote to queen for simplicity
      });
      
      if (!move) return false;
      
      // If move is valid, make it on the actual game
      game.move(move);
      
      // Send move to server
      if (onMove) {
        onMove(from, to);
      }
      
      // Update move history
      setMoveHistory(game.history({ verbose: true }));
      updateStatus(game);
      
      return true;
    } catch (error) {
      console.error('Error making move:', error);
      return false;
    }
  }, [game, isThinking, onMove, updateStatus]);

  const handleMove = useCallback((sourceSquare, targetSquare) => {
    if (mode === 'online') {
      const isWhiteTurn = game.turn() === 'w';
      const isPlayerTurn = (playerColor === 'white' && isWhiteTurn) || 
                          (playerColor === 'black' && !isWhiteTurn);
      
      if (!isPlayerTurn) {
        return false;
      }
    } else if (mode === 'bot' && game.turn() !== boardOrientation[0]) {
      return false;
    }
    
    if (isThinking) {
      return false;
    }

    return makeMove(sourceSquare, targetSquare);
  }, [game, mode, playerColor, boardOrientation, isThinking, makeMove]);

  const handleBotMove = useCallback(async () => {
    if (mode === 'bot' && !game.isGameOver()) {
      try {
        setIsThinking(true);
        const response = await fetch('http://localhost:3001/api/bot-move', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fen: game.fen(),
            depth: selectedDepth
          })
        });

        if (!response.ok) {
          throw new Error('Failed to get bot move');
        }

        const data = await response.json();
        if (data.move) {
          const from = data.move.substring(0, 2);
          const to = data.move.substring(2, 4);
          makeMove(from, to);
        }
      } catch (error) {
        console.error('Bot move error:', error);
      } finally {
        setIsThinking(false);
      }
    }
  }, [game, mode, selectedDepth, makeMove]);

  return (
    <div className="flex flex-col md:flex-row gap-8 p-4">
      <div className="flex-1">
        <ChessBoard
          game={game}
          onMove={handleMove}
          orientation={boardOrientation}
          isThinking={isThinking}
        />
        <GameStatus status={status} />
      </div>
      
      <div className="w-full md:w-80 space-y-4">
        <MoveHistoryTable moves={moveHistory} />
        <GameControls
          mode={mode}
          onDepthChange={setSelectedDepth}
          onBotMove={handleBotMove}
          isThinking={isThinking}
        />
        <GameTips />
      </div>
    </div>
  );
};

export default ChessGame; 