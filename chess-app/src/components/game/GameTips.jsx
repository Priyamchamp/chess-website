import { motion } from 'framer-motion';

function GameTips({ isBotMode }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2"
    >
      <ul className="space-y-2 text-sm text-gray-600">
        <li className="flex items-start gap-2">
          <span className="mt-1 w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></span>
          <span>Drag and drop pieces to make moves</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 w-2 h-2 bg-yellow-400 rounded-full flex-shrink-0"></span>
          <span>Use the "Flip Board" button to change your perspective</span>
        </li>
        {isBotMode && (
          <>
            <li className="flex items-start gap-2">
              <span className="mt-1 w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></span>
              <span>Use the "Undo Move" button to take back your last move</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 w-2 h-2 bg-purple-400 rounded-full flex-shrink-0"></span>
              <span>Adjust the bot difficulty using the depth selector - higher depth means stronger play but slower responses</span>
            </li>
          </>
        )}
      </ul>
    </motion.div>
  );
}

export default GameTips;