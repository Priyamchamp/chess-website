import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaTrophy, FaMedal, FaChessKing, FaSpinner, FaArrowLeft } from 'react-icons/fa';
import { getTopPlayers } from '../../services/ratingService';
import { useNavigate } from 'react-router-dom';

const rankIconMap = {
  'Bronze': <FaMedal className="text-amber-700" />,
  'Silver': <FaMedal className="text-gray-400" />,
  'Gold': <FaMedal className="text-yellow-400" />,
  'Platinum': <FaTrophy className="text-blue-400" />,
  'Diamond': <FaTrophy className="text-purple-400" />,
  'Master': <FaChessKing className="text-indigo-600" />,
  'Grandmaster': <FaChessKing className="text-red-600" />
};

function Leaderboard() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const topPlayers = await getTopPlayers(20);
        setPlayers(topPlayers);
        setError(null);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        setError('Failed to load leaderboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboard();
  }, []);
  
  const getTopThreeVariants = (index) => {
    if (index === 0) {
      return {
        hidden: { opacity: 0, y: -20 },
        visible: { 
          opacity: 1, 
          y: 0, 
          scale: 1.05,
          transition: { delay: 0.3, duration: 0.5 }
        }
      };
    } else if (index === 1 || index === 2) {
      return {
        hidden: { opacity: 0, y: -20 },
        visible: { 
          opacity: 1, 
          y: 0, 
          transition: { delay: 0.4 + (index * 0.1), duration: 0.5 }
        }
      };
    }
  };
  
  const handleBackToHome = () => {
    navigate('/');
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center mb-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mr-4 text-indigo-600 hover:text-indigo-800"
            onClick={handleBackToHome}
          >
            <FaArrowLeft size={24} />
          </motion.button>
          <h1 className="text-3xl font-bold text-gray-800">Leaderboard</h1>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="text-indigo-600"
            >
              <FaSpinner size={40} />
            </motion.div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
              onClick={() => window.location.reload()}
            >
              Try Again
            </motion.button>
          </div>
        ) : (
          <div>
            {/* Top 3 players */}
            {players.length > 0 && (
              <motion.div 
                className="flex flex-col md:flex-row gap-6 justify-center mb-8"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.2
                    }
                  }
                }}
              >
                {players.slice(0, 3).map((player, index) => (
                  <motion.div
                    key={player.userId}
                    className={`bg-white rounded-xl shadow-lg overflow-hidden relative flex-1 ${
                      index === 0 ? 'border-2 border-yellow-400' : ''
                    }`}
                    variants={getTopThreeVariants(index)}
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 ${
                      index === 0 ? 'bg-yellow-400' : 
                      index === 1 ? 'bg-gray-400' : 'bg-amber-700'
                    }`}></div>
                    <div className="p-6 text-center">
                      <div className="inline-block p-3 rounded-full mb-3 bg-indigo-50">
                        {index === 0 ? (
                          <FaTrophy className="text-yellow-400 text-2xl" />
                        ) : index === 1 ? (
                          <FaTrophy className="text-gray-400 text-2xl" />
                        ) : (
                          <FaTrophy className="text-amber-700 text-2xl" />
                        )}
                      </div>
                      <div className="text-xl font-semibold mb-1">
                        {index + 1}. {player.gamingName}
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <span className="font-mono bg-indigo-100 px-2 py-1 rounded text-indigo-800">
                          {player.rating}
                        </span>
                        <span className="flex items-center gap-1 text-gray-700">
                          {rankIconMap[player.rank] || <FaMedal />}
                          {player.rank}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
            
            {/* Rest of the leaderboard */}
            <motion.div
              className="bg-white rounded-xl shadow-lg overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {players.slice(3).map((player, idx) => (
                      <motion.tr 
                        key={player.userId}
                        className="hover:bg-gray-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 + (idx * 0.05), duration: 0.3 }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {idx + 4}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {player.gamingName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-indigo-700">
                          {player.rating}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          <div className="flex items-center gap-2">
                            {rankIconMap[player.rank] || <FaMedal />}
                            {player.rank}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                    
                    {players.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-10 text-center text-gray-500">
                          No players on the leaderboard yet. Be the first to join!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Leaderboard; 