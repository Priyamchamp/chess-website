export const chessPieceAnimationStyles = `
  /* Basic Piece Animations */
  @keyframes piece-fade-in {
    0% { opacity: 0; transform: translateY(-10px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @keyframes piece-capture {
    0% { transform: scale(1); }
    30% { transform: scale(1.2); }
    40% { transform: scale(1.1); filter: brightness(1.5); }
    100% { transform: scale(0); opacity: 0; }
  }

  @keyframes piece-move {
    0% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
    100% { transform: translateY(0); }
  }

  @keyframes piece-promote {
    0% { transform: scale(0.7); filter: brightness(1.3); }
    50% { transform: scale(1.2); filter: brightness(1.7); }
    100% { transform: scale(1); filter: brightness(1); }
  }

  @keyframes piece-check {
    0%, 100% { filter: drop-shadow(0 0 5px rgba(255, 0, 0, 0.8)); }
    50% { filter: drop-shadow(0 0 10px rgba(255, 0, 0, 0.5)); }
  }

  /* Square Highlight Animations */
  @keyframes square-highlight {
    0%, 100% { background-color: rgba(255, 255, 0, 0.3); }
    50% { background-color: rgba(255, 255, 0, 0.5); }
  }

  @keyframes square-check {
    0%, 100% { background-color: rgba(255, 0, 0, 0.2); }
    50% { background-color: rgba(255, 0, 0, 0.4); }
  }

  @keyframes square-checkmate {
    0% { background-color: rgba(255, 0, 0, 0.3); }
    25% { background-color: rgba(255, 0, 0, 0.5); }
    50% { background-color: rgba(255, 0, 0, 0.3); }
    75% { background-color: rgba(255, 0, 0, 0.5); }
    100% { background-color: rgba(255, 0, 0, 0.3); }
  }

  /* Apply animations to chess pieces */
  .piece-appears {
    animation: piece-fade-in 0.3s ease-out forwards;
  }

  .piece-moves {
    animation: piece-move 0.3s ease-in-out;
    transition: all 0.3s ease;
  }

  .piece-captured {
    animation: piece-capture 0.4s ease-out forwards;
  }

  .piece-promoted {
    animation: piece-promote 0.5s ease-in-out;
  }

  .piece-in-check {
    animation: piece-check 1s infinite;
  }

  /* Enhanced board styling */
  .board-wrapper {
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .board-wrapper:hover {
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
    transform: translateY(-5px);
  }

  /* Interactive elements */
  .chess-square {
    transition: background-color 0.2s ease;
  }

  .chess-square:hover {
    background-color: rgba(0, 0, 0, 0.05) !important;
  }

  .chess-square.legal-move {
    position: relative;
  }

  .chess-square.legal-move::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 25%;
    height: 25%;
    border-radius: 50%;
    background-color: rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;
  }

  .chess-square.legal-move:hover::after {
    width: 30%;
    height: 30%;
    background-color: rgba(0, 0, 0, 0.3);
  }

  .chess-square.legal-capture {
    position: relative;
  }

  .chess-square.legal-capture::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 2px solid rgba(0, 0, 0, 0.3);
    border-radius: 50%;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; transform: scale(0.95); }
    50% { opacity: 0.8; transform: scale(1); }
  }
`;

// Chess piece themes
export const chessThemes = {
  default: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
  alpha: 'https://chessboardjs.com/img/chesspieces/alpha/{piece}.png',
  chess24: 'https://chess24.com/static/assets/pieces/chess24/{piece}.png',
  chesscom: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/{piece}.png'
};

// Board color themes
export const boardThemes = {
  default: {
    light: '#f0d9b5',
    dark: '#b58863'
  },
  blue: {
    light: '#cad9e3',
    dark: '#5d8bae'
  },
  green: {
    light: '#ebecd0',
    dark: '#779556'
  },
  purple: {
    light: '#e0d7ea',
    dark: '#8877b7'
  }
};