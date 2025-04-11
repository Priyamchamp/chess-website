import { motion } from 'framer-motion';
import { FaChessBoard, FaUndo, FaRedo, FaRandom } from 'react-icons/fa';

function GameControls({ 
  onNewGame, 
  onUndoMove,
  onFlipBoard,
  gameMode,
  selectedDepth = 3,
  onDepthChange,
  boardOrientation = 'white'
}) {
  // Determine if we're in bot mode
  const isBotMode = gameMode === 'bot';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNewGame}
          className="game-button"
        >
          <FaRedo size={16} />
          <span>New Game</span>
        </motion.button>
        
        <motion.button
          whileHover={isBotMode ? { scale: 1.05 } : {}}
          whileTap={isBotMode ? { scale: 0.95 } : {}}
          onClick={onUndoMove}
          disabled={!isBotMode}
          className={`game-button ${!isBotMode ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <FaUndo size={16} />
          <span>Undo Move</span>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onFlipBoard}
          className="game-button secondary-button"
        >
          <FaChessBoard size={16} />
          <span>Flip Board ({boardOrientation === 'white' ? 'to Black' : 'to White'})</span>
        </motion.button>
      </div>

      {isBotMode && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bot Difficulty
          </label>
          <div className="flex flex-wrap justify-center gap-2">
            {[1, 2, 3, 4, 5].map((depth) => (
              <button
                key={depth}
                onClick={() => onDepthChange(depth)}
                className={`difficulty-button ${selectedDepth === depth ? 'active' : ''}`}
              >
                {depth === 1 && 'Beginner'}
                {depth === 2 && 'Easy'}
                {depth === 3 && 'Medium'}
                {depth === 4 && 'Hard'}
                {depth === 5 && 'Expert'}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500 text-center">
            Higher difficulty means stronger play but slower response time.
          </p>
        </div>
      )}
    </div>
  );
}

export default GameControls;