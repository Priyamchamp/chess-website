import React, { useEffect, useRef, memo, useState, useCallback } from 'react';
import { chessPieceAnimationStyles } from '../../styles/chessStyles';
import { Chessboard } from 'react-chessboard';
import { motion, AnimatePresence } from 'framer-motion';
import './ChessBoard.css'; // Import custom CSS
import { useGame } from '../../contexts/GameContext';
import { Chess } from 'chess.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faBolt, faCrown } from '@fortawesome/free-solid-svg-icons';
import { pieceVariants, moveIndicatorVariants, animatePieceMovement, lastMoveHighlight, checkHighlight, sounds, playSound } from './ChessPieceAnimations';

const ChessBoard = memo(({ 
  position = 'start', 
  onMove, 
  orientation = 'white', 
  isThinking = false, 
  game,
  boardState, 
  onSquareClick, 
  selectedSquare, 
  legalMoves, 
  lastMove, 
  isCheck, 
  playerColor = 'white',
  isOnline = false,
  onlineMoves = [] // Add default empty array
}) => {
  const boardRef = useRef(null);
  const [hoveredSquare, setHoveredSquare] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [capturedPiece, setCapturedPiece] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [chess, setChess] = useState(null);
  const [board, setBoard] = useState(boardState || []); // Initialize with boardState if provided
  const [promotionSquare, setPromotionSquare] = useState(null);
  const [squareRefs, setSquareRefs] = useState({});
  const [animations, setAnimations] = useState({});
  const [moveAnimation, setMoveAnimation] = useState(false);
  const [moveHistory, setMoveHistory] = useState([]);
  const [checkEffect, setCheckEffect] = useState(false);
  const [isInCheck, setIsInCheck] = useState(false);
  const [lastMoveState, setLastMove] = useState(lastMove || null);
  const [invalidMoveMessage, setInvalidMoveMessage] = useState(false);
  const piecesRef = useRef({});
  
  // Track previous position for animations
  const prevPositionRef = useRef(position);

  // Add chessboard prototype methods once
  useEffect(() => {
    const styleId = 'chess-piece-animations';
    if (!document.getElementById(styleId)) {
    const styleTag = document.createElement('style');
      styleTag.id = styleId;
      styleTag.innerHTML = chessPieceAnimationStyles + `
        /* Enhanced animations */
        .piece-container {
          transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), filter 0.3s ease;
          will-change: transform;
          z-index: 5;
        }
        .piece-container:hover {
          transform: translateY(-8px) scale(1.1);
          filter: drop-shadow(0 8px 15px rgba(0, 0, 0, 0.4));
          z-index: 10;
          cursor: grab;
        }
        .piece-container:active {
          cursor: grabbing;
          transform: translateY(-4px) scale(1.15);
          transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .highlight-last-move {
          animation: pulse-fade 2.5s ease-in-out;
        }
        @keyframes pulse-fade {
          0% { background-color: rgba(255, 255, 0, 0); }
          20% { background-color: rgba(255, 255, 0, 0.5); }
          100% { background-color: rgba(255, 255, 0, 0); }
        }
        .move-indicator {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1); opacity: 0.8; }
        }
        .capture-indicator {
          animation: pulse-capture 1.5s infinite;
        }
        @keyframes pulse-capture {
          0%, 100% { transform: scale(0.8); opacity: 0.8; border-color: rgba(255, 0, 0, 0.4); }
          50% { transform: scale(1.1); opacity: 1; border-color: rgba(255, 0, 0, 0.8); }
        }
        .check-effect {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle, rgba(255, 0, 0, 0.2) 0%, rgba(255, 0, 0, 0) 70%);
          animation: check-pulse 1.5s infinite;
          pointer-events: none;
          z-index: 2;
        }
        @keyframes check-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        .piece-captured {
          animation: captured 0.5s ease-out forwards;
        }
        @keyframes captured {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3) rotate(5deg); opacity: 0.7; }
          100% { transform: scale(0) rotate(-10deg); opacity: 0; }
        }
        /* Add 3D perspective to the board */
        .board-container {
          perspective: 1000px;
          position: relative;
        }
        .board-inner {
          transition: transform 0.5s ease;
        }
        .board-inner:hover {
          transform: rotateX(2deg);
        }
        .square-highlight {
          position: absolute;
          inset: 0;
          background-color: rgba(255, 255, 0, 0.4);
          z-index: 1;
          animation: square-highlight 2s infinite;
        }
        @keyframes square-highlight {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        
        /* Game notification animations */
        .game-notification {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          padding: 15px 25px;
          border-radius: 8px;
          background-color: rgba(0, 0, 0, 0.8);
          color: white;
          font-weight: bold;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 100;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          will-change: transform, opacity;
        }
        
        .checkmate {
          background-color: rgba(76, 175, 80, 0.9);
          animation: pop-in 0.5s forwards;
        }
        
        .draw, .stalemate {
          background-color: rgba(33, 150, 243, 0.9);
        }
        
        .check {
          background-color: rgba(244, 67, 54, 0.9);
          animation: pulse-check 1.2s ease-in-out;
        }
        
        .invalid-move {
          background-color: rgba(255, 87, 34, 0.9);
          animation: shake 0.8s cubic-bezier(.36,.07,.19,.97) both;
        }
        
        .icon-shake {
          animation: icon-shake 1.5s ease infinite;
        }
        
        .icon-pulse {
          animation: icon-pulse 1s ease infinite;
        }
        
        @keyframes pop-in {
          0% { transform: translate(-50%, -50%) scale(0.7); opacity: 0; }
          40% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        
        @keyframes pulse-check {
          0% { transform: translate(-50%, -50%) scale(0.9); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
        
        @keyframes shake {
          10%, 90% { transform: translate(-50%, -50%) translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate(-50%, -50%) translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate(-50%, -50%) translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate(-50%, -50%) translate3d(4px, 0, 0); }
        }
        
        @keyframes icon-shake {
          0% { transform: rotate(0); }
          25% { transform: rotate(15deg); }
          50% { transform: rotate(0); }
          75% { transform: rotate(-15deg); }
          100% { transform: rotate(0); }
        }
        
        @keyframes icon-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
      `;
    document.head.appendChild(styleTag);
      
      return () => {
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
          existingStyle.remove();
        }
      };
    }
  }, []);

  // Check if the position represents a check
  useEffect(() => {
    if (game && game.isCheck()) {
      setCheckEffect(true);
      setTimeout(() => setCheckEffect(false), 1500);
      
      // Play check sound - with fallback handling
      const checkSound = new Audio('/sounds/check.mp3');
      checkSound.volume = 0.4;
      checkSound.play().catch(err => console.log('Audio play failed, this is normal until user interacts with the page'));
    }
  }, [position, game]);

  // Detect captured pieces by comparing positions
  useEffect(() => {
    if (prevPositionRef.current !== position && game) {
      try {
        const prevBoard = new Chess(prevPositionRef.current);
        const currentBoard = new Chess(position);
        
        // Find pieces that were present in prev but not in current
        for (let i = 0; i < 64; i++) {
          const square = String.fromCharCode(97 + (i % 8)) + (8 - Math.floor(i / 8));
          const prevPiece = prevBoard.get(square);
          const currentPiece = currentBoard.get(square);
          
          if (prevPiece && !currentPiece) {
            setCapturedPiece({ square, piece: prevPiece.type });
            
            // Play capture sound with fallback handling
            const captureSound = new Audio('/sounds/capture.mp3');
            captureSound.volume = 0.3;
            captureSound.play().catch(err => console.log('Audio play failed, this is normal until user interacts with the page'));
            
            break;
          }
        }
      } catch (err) {
        console.error('Error comparing positions:', err);
      }
      
      prevPositionRef.current = position;
    }
  }, [position, game]);

  // Reset capture animation after timeout
  useEffect(() => {
    if (capturedPiece) {
      setTimeout(() => {
        setCapturedPiece(null);
      }, 700);
    }
  }, [capturedPiece]);

  // Calculate the possible moves for a piece
  const calculatePossibleMoves = useCallback((square) => {
    if (!game || !square) return [];
    
    try {
      // Get the piece at the square
      const piece = game.get(square);
      if (!piece) return [];
      
      // Only show moves for the current player's pieces
      if ((piece.color === 'w') !== (game.turn() === 'w')) return [];
      
      // Get all legal moves for the piece
      const moves = [];
      for (const move of game.moves({ square, verbose: true })) {
        moves.push(move.to);
      }
      
      return moves;
    } catch (error) {
      console.error('Error calculating possible moves:', error);
      return [];
    }
  }, [game]);

  // Handle move
  const handleMove = useCallback((from, to, promotion) => {
    if (isThinking) return false;
    
    try {
      // Check if move is legal
      const move = { from, to, promotion };
      const isLegalMove = game && game.moves({ verbose: true }).some(m => 
        m.from === from && m.to === to && (!m.promotion || m.promotion === promotion)
      );
      
      if (!isLegalMove) {
        // Show invalid move notification
        setInvalidMoveMessage(true);
        setTimeout(() => setInvalidMoveMessage(false), 2000);
        
        // Play error sound
        const errorSound = new Audio('/sounds/error.mp3');
        errorSound.volume = 0.3;
        errorSound.play().catch(err => console.log('Audio play failed, this is normal until user interacts with the page'));
        
        return false;
      }
      
      // Set last move for highlighting
      setLastMove({ from, to });
      setMoveAnimation(true);
      
      // Trigger animation timeout
      setTimeout(() => {
        setMoveAnimation(false);
      }, 1500);
      
      // Check if this is a capture move
      if (game && game.get(to)) {
        setCapturedPiece({ square: to, piece: game.get(to).type });
      }
      
      // Delegate to the parent handler
      if (typeof onMove === 'function') {
        return onMove(from, to, promotion);
      }
      
      return false;
    } catch (error) {
      console.error('Error in handleMove:', error);
      return false;
    }
  }, [isThinking, game, onMove]);

  // Render the chessboard using react-chessboard
  return (
    <div className="chessboard-container">
      <Chessboard
        id="chess-game"
        position={position} 
        onPieceDrop={(from, to) => handleMove(from, to)}
        boardOrientation={orientation}
        customBoardStyle={{
          borderRadius: "4px",
          boxShadow: "none",
          animation: isThinking ? "pulse 2s infinite" : "none",
          maxWidth: "min(100%, 80vh)",
          maxHeight: "min(calc(100vh - 150px), calc(100vw - 40px))",
          height: "auto",
          margin: "0 auto"
        }}
        customDarkSquareStyle={{ backgroundColor: "#769656" }}
        customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
        customPieces={{
          wP: ({ squareWidth }) => <ChessPiece type="wP" width={squareWidth} />,
          wN: ({ squareWidth }) => <ChessPiece type="wN" width={squareWidth} />,
          wB: ({ squareWidth }) => <ChessPiece type="wB" width={squareWidth} />,
          wR: ({ squareWidth }) => <ChessPiece type="wR" width={squareWidth} />,
          wQ: ({ squareWidth }) => <ChessPiece type="wQ" width={squareWidth} />,
          wK: ({ squareWidth }) => <ChessPiece type="wK" width={squareWidth} />,
          bP: ({ squareWidth }) => <ChessPiece type="bP" width={squareWidth} />,
          bN: ({ squareWidth }) => <ChessPiece type="bN" width={squareWidth} />,
          bB: ({ squareWidth }) => <ChessPiece type="bB" width={squareWidth} />,
          bR: ({ squareWidth }) => <ChessPiece type="bR" width={squareWidth} />,
          bQ: ({ squareWidth }) => <ChessPiece type="bQ" width={squareWidth} />,
          bK: ({ squareWidth }) => <ChessPiece type="bK" width={squareWidth} />
        }}
        areArrowsAllowed={true}
        showBoardNotation={true}
        animationDuration={300}
        customArrows={lastMoveState ? [[lastMoveState.from, lastMoveState.to]] : []}
        arePiecesDraggable={true}
        customSquareStyles={{
          ...(lastMoveState?.from && { [lastMoveState.from]: { backgroundColor: "rgba(255, 255, 0, 0.3)" } }),
          ...(lastMoveState?.to && { [lastMoveState.to]: { backgroundColor: "rgba(255, 255, 0, 0.3)" } }),
          ...(selectedSquare && { [selectedSquare]: { backgroundColor: "rgba(173, 216, 230, 0.5)" } }),
          ...(legalMoves && legalMoves.reduce((acc, square) => {
            acc[square] = game?.get(square) 
              ? { backgroundColor: "rgba(255, 0, 0, 0.3)" } 
              : { backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.2) 25%, transparent 25%)" };
            return acc;
          }, {}))
        }}
        onPieceDragBegin={(piece, sourceSquare) => {
          const moves = calculatePossibleMoves(sourceSquare);
          setPossibleMoves(moves);
          setHoveredSquare(sourceSquare);
        }}
        onPieceDragEnd={() => {
          setPossibleMoves([]);
          setHoveredSquare(null);
        }}
        onSquareClick={(square) => {
          if (hoveredSquare === square) {
            // Clicking the same square deselects it
            setHoveredSquare(null);
            setPossibleMoves([]);
          } else if (hoveredSquare && possibleMoves.includes(square)) {
            // Clicking a valid target square makes a move
            handleMove(hoveredSquare, square);
            setHoveredSquare(null);
            setPossibleMoves([]);
          } else {
            // Clicking a new square selects it
            const moves = calculatePossibleMoves(square);
            setPossibleMoves(moves);
            setHoveredSquare(square);
          }
          
          // Pass through to parent handler if needed
          if (typeof onSquareClick === 'function') {
            onSquareClick(square);
          }
        }}
        // Responsive board width
        boardWidth={
          (() => {
            const { innerWidth: width, innerHeight: height } = window;
            // Mobile portrait
            if (width < 576) {
              return Math.min(width - 20, height * 0.7);
            }
            // Mobile landscape & small tablets
            else if (width < 768) {
              return Math.min(width * 0.8, height * 0.8);
            }
            // Tablets & small laptops
            else if (width < 992) {
              return Math.min(width * 0.6, 600);
            }
            // Laptops & desktops
            else if (width < 1200) {
              return Math.min(width * 0.5, 650);
            }
            // Large desktops
            else {
              return Math.min(width * 0.4, 700);
            }
          })()
        }
      />
      
      {/* Game status notifications */}
      <AnimatePresence>
        {game?.isCheckmate() && (
          <motion.div 
            className="game-notification checkmate"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <FontAwesomeIcon icon={faCrown} className="icon-shake" />
            <span>{game.turn() === 'w' ? 'Black' : 'White'} wins by checkmate!</span>
          </motion.div>
        )}
        
        {game?.isDraw() && (
          <motion.div 
            className="game-notification draw"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <span>Game ends in a draw!</span>
          </motion.div>
        )}
        
        {game?.isStalemate() && (
          <motion.div 
            className="game-notification stalemate"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <span>Stalemate! The game ends in a draw.</span>
          </motion.div>
        )}
        
        {checkEffect && (
          <motion.div 
            className="game-notification check"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <FontAwesomeIcon icon={faBolt} className="icon-pulse" />
            <span>Check!</span>
          </motion.div>
        )}
        
        {invalidMoveMessage && (
          <motion.div 
            className="game-notification invalid-move"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <span>Invalid move! Try again.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// Custom chess piece component to match chess.com style
const ChessPiece = ({ type, width }) => {
  // Map piece types to image paths
  const pieceImage = `/images/pieces/${type}.svg`;

  // Fallback to using Unicode characters if images aren't available
  const unicodePieces = {
    wP: '♙', bP: '♟',
    wN: '♘', bN: '♞',
    wB: '♗', bB: '♝',
    wR: '♖', bR: '♜',
    wQ: '♕', bQ: '♛',
    wK: '♔', bK: '♚'
  };

  // Create an image element
  return (
    <div
      style={{
        width: width,
        height: width,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: width * 0.7,
        filter: type.startsWith('w') ? 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' : 'drop-shadow(1px 1px 2px rgba(0,0,0,0.5))',
        willChange: 'transform',
        transition: 'transform 0.2s',
      }}
      className="chess-piece"
    >
      {unicodePieces[type]}
    </div>
  );
};

ChessBoard.displayName = 'ChessBoard';

export default ChessBoard;