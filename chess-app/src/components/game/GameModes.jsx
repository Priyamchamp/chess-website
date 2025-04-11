import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserFriends, FaRobot, FaTrophy, FaVolumeUp, FaVolumeMute, FaChessKnight, FaChessPawn, FaChessRook, FaChessQueen } from 'react-icons/fa';
import toast from 'react-hot-toast';

function GameModes() {
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [audio] = useState(new Audio('/sounds/background-music.mp3'));
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    // Set up audio
    audio.loop = true;
    audio.volume = 0.3;
    
    // Check if user preference for music exists in localStorage
    const musicPreference = localStorage.getItem('chessMusicEnabled');
    if (musicPreference === 'true') {
      playMusic();
    }
    
    // Listen for toggle music event from header
    const handleToggleMusic = (e) => {
      if (e.detail?.playing) {
        playMusic();
      } else {
        pauseMusic();
      }
    };
    
    window.addEventListener('toggleMusic', handleToggleMusic);
    
    // Clean up when component unmounts
    return () => {
      audio.pause();
      audio.currentTime = 0;
      window.removeEventListener('toggleMusic', handleToggleMusic);
    };
  }, [audio]);

  const toggleMusic = () => {
    if (isMusicPlaying) {
      pauseMusic();
    } else {
      playMusic();
    }
  };

  const playMusic = () => {
    audio.play().catch(error => {
      console.error("Audio play failed:", error);
      toast.error("Couldn't play music. Please interact with the page first.");
    });
    setIsMusicPlaying(true);
    localStorage.setItem('chessMusicEnabled', 'true');
    toast.success("Music enabled", { icon: "🎵" });
  };

  const pauseMusic = () => {
    audio.pause();
    setIsMusicPlaying(false);
    localStorage.setItem('chessMusicEnabled', 'false');
    toast.success("Music disabled", { icon: "🔇" });
  };

  // Chess piece animations for background
  const chessPieces = [
    { Icon: FaChessKnight, color: "text-blue-500", delay: 0 },
    { Icon: FaChessPawn, color: "text-purple-500", delay: 0.5 },
    { Icon: FaChessRook, color: "text-indigo-500", delay: 1 },
    { Icon: FaChessQueen, color: "text-pink-500", delay: 1.5 }
  ];

  return (
    <div className="py-8 relative overflow-hidden">
      {/* Animated background chess pieces */}
      {chessPieces.map((piece, index) => (
        <motion.div
          key={index}
          className={`absolute opacity-5 ${piece.color}`}
          initial={{ 
            x: Math.random() * 100 - 50, 
            y: Math.random() * 100 - 50,
            rotate: Math.random() * 180 - 90,
            scale: Math.random() * 2 + 3
          }}
          animate={{ 
            x: [Math.random() * 100 - 50, Math.random() * 100 - 50, Math.random() * 100 - 50],
            y: [Math.random() * 100 - 50, Math.random() * 100 - 50, Math.random() * 100 - 50],
            rotate: [Math.random() * 360, Math.random() * 360, Math.random() * 360]
          }}
          transition={{ 
            duration: 20, 
            repeat: Infinity, 
            repeatType: "reverse",
            delay: piece.delay
          }}
          style={{
            top: `${Math.random() * 80 + 10}%`,
            left: `${Math.random() * 80 + 10}%`,
            zIndex: -1
          }}
        >
          <piece.Icon size={60} />
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12 relative z-10"
      >
        <motion.h1 
          className="text-4xl font-bold text-gray-800 mb-4"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ 
            duration: 0.5,
            type: "spring",
            stiffness: 100
          }}
        >
          Choose Your Game Mode
        </motion.h1>
        <motion.p 
          className="text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Play chess online against other players or challenge our AI bot
        </motion.p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          whileHover={{ 
            scale: 1.03, 
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
            y: -5 
          }}
          className="bg-white rounded-xl shadow-lg overflow-hidden"
          onHoverStart={() => setHoveredCard('player')}
          onHoverEnd={() => setHoveredCard(null)}
        >
          <Link to="/matchmaking" className="block p-8 h-full">
            <div className="text-center">
              <motion.div 
                className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"
                animate={{ 
                  scale: hoveredCard === 'player' ? [1, 1.1, 1] : 1,
                  rotate: hoveredCard === 'player' ? [0, -5, 5, 0] : 0 
                }}
                transition={{ 
                  duration: 0.5, 
                  repeat: hoveredCard === 'player' ? Infinity : 0,
                  repeatDelay: 1
                }}
              >
                <FaUserFriends className="text-2xl text-blue-600" />
              </motion.div>
              <motion.h3 
                className="text-xl font-bold text-gray-800 mb-3"
                animate={{ 
                  color: hoveredCard === 'player' ? ['#1e40af', '#3b82f6', '#1e40af'] : '#1f2937' 
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Player vs Player
              </motion.h3>
              <p className="text-gray-600 mb-4">
                Challenge other players in real-time matches. Find opponents through matchmaking or invite friends.
              </p>
              <motion.div 
                className="mt-4 inline-block py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Play Online
              </motion.div>
            </div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          whileHover={{ 
            scale: 1.03, 
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
            y: -5 
          }}
          className="bg-white rounded-xl shadow-lg overflow-hidden"
          onHoverStart={() => setHoveredCard('bot')}
          onHoverEnd={() => setHoveredCard(null)}
        >
          <Link to="/game/bot" className="block p-8 h-full">
            <div className="text-center">
              <motion.div 
                className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4"
                animate={{ 
                  scale: hoveredCard === 'bot' ? [1, 1.1, 1] : 1,
                  rotate: hoveredCard === 'bot' ? [0, 5, -5, 0] : 0 
                }}
                transition={{ 
                  duration: 0.5, 
                  repeat: hoveredCard === 'bot' ? Infinity : 0,
                  repeatDelay: 1
                }}
              >
                <FaRobot className="text-2xl text-purple-600" />
              </motion.div>
              <motion.h3 
                className="text-xl font-bold text-gray-800 mb-3"
                animate={{ 
                  color: hoveredCard === 'bot' ? ['#7e22ce', '#a855f7', '#7e22ce'] : '#1f2937' 
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Player vs Bot
              </motion.h3>
              <p className="text-gray-600 mb-4">
                Practice your skills against our advanced chess AI. Adjust the difficulty to match your level.
              </p>
              <motion.div 
                className="mt-4 inline-block py-2 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Play vs Bot
              </motion.div>
            </div>
          </Link>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-center mt-12"
      >
        <div className="flex justify-center items-center gap-6">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
              to="/leaderboard"
              className="inline-flex items-center gap-2 py-3 px-6 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity, 
                  repeatDelay: 3 
                }}
              >
                <FaTrophy className="text-yellow-500" />
              </motion.div>
              <span>View Leaderboard</span>
            </Link>
          </motion.div>
          
          <motion.button 
            onClick={toggleMusic}
            className="flex items-center gap-2 py-3 px-6 bg-indigo-100 text-indigo-700 rounded-lg font-medium hover:bg-indigo-200 transition"
            aria-label={isMusicPlaying ? "Mute background music" : "Play background music"}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <AnimatePresence mode="wait">
              {isMusicPlaying ? (
                <motion.div
                  key="volume-on"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 0.8,
                      repeatDelay: 0.5
                    }}
                  >
                    <FaVolumeUp className="text-indigo-600" />
                  </motion.div>
                  <span>Music On</span>
                </motion.div>
              ) : (
                <motion.div
                  key="volume-off"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <FaVolumeMute className="text-indigo-600" />
                  <span>Music Off</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

export default GameModes; 