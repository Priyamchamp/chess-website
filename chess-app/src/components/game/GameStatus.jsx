import { motion } from 'framer-motion';

function GameStatus({ isCheck, isCheckmate, isStalemate, currentTurn, playerColor }) {
  const getStatusText = () => {
    if (isCheckmate) return 'Checkmate!';
    if (isStalemate) return 'Stalemate - Draw!';
    if (isCheck) return 'Check!';
    return `${currentTurn === playerColor ? 'Your' : "Opponent's"} turn`;
  };

  const getStatusColor = () => {
    if (isCheckmate) return 'text-red-600 font-bold';
    if (isStalemate) return 'text-yellow-600 font-bold';
    if (isCheck) return 'text-orange-600 font-bold';
    return currentTurn === playerColor ? 'text-green-600' : 'text-gray-700';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`text-lg mb-6 ${getStatusColor()}`}
    >
      {getStatusText()}
    </motion.div>
  );
}

export default GameStatus;