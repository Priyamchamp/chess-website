import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaUser, FaSignOutAlt, FaChessKing, FaMusic, FaVolumeUp, FaVolumeMute, FaCog } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

function Header() {
  const { currentUser, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(
    localStorage.getItem('chessMusicEnabled') === 'true'
  );

  const handleLogout = async () => {
    try {
      setShowUserMenu(false);
      await logout();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    }
  };

  const handleLogoClick = (e) => {
    e.preventDefault();
    // Force a full page reload to reset any state
    window.location.href = '/';
  };
  
  const toggleMusic = () => {
    const newState = !isMusicPlaying;
    setIsMusicPlaying(newState);
    localStorage.setItem('chessMusicEnabled', newState ? 'true' : 'false');
    
    // Dispatch a custom event that GameModes component can listen for
    const event = new CustomEvent('toggleMusic', { detail: { playing: newState } });
    window.dispatchEvent(event);
    
    toast.success(newState ? "Music enabled" : "Music disabled", { 
      icon: newState ? "🎵" : "🔇" 
    });
  };

  return (
    <motion.header 
      className="bg-white shadow-md py-4"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          {/* Logo and navigation */}
          <div className="flex items-center space-x-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                to="/"
                onClick={handleLogoClick}
                className="flex items-center"
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
                >
                  <FaChessKing className="h-10 w-10 mr-2 text-indigo-600" />
                </motion.div>
                <motion.span 
                  className="font-bold text-xl text-gray-900"
                  animate={{ 
                    color: ['#1e1e1e', '#4338ca', '#1e1e1e'],
                  }}
                  transition={{ duration: 5, repeat: Infinity, repeatType: "reverse" }}
                >
                  Chess App
                </motion.span>
              </Link>
            </motion.div>
            
            <nav className="hidden md:flex space-x-6">
              <motion.div
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link 
                  to="/" 
                  onClick={handleLogoClick}
                  className="text-blue-600 font-medium hover:text-blue-800 transition-colors"
                >
                  Home
                </Link>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link 
                  to="/leaderboard" 
                  className="text-gray-600 font-medium hover:text-gray-800 transition-colors"
                >
                  Leaderboard
                </Link>
              </motion.div>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <motion.button
              onClick={toggleMusic}
              className="p-2 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9, rotate: 0 }}
              aria-label={isMusicPlaying ? "Mute music" : "Play music"}
            >
              <AnimatePresence mode="wait">
                {isMusicPlaying ? (
                  <motion.div
                    key="volume-on"
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 30 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FaVolumeUp />
                  </motion.div>
                ) : (
                  <motion.div
                    key="volume-off"
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 30 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FaVolumeMute />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            <motion.div 
              className="relative"
              whileHover={{ scale: 1.05 }}
            >
              <motion.button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                {currentUser?.photoURL ? (
                  <motion.img 
                    src={currentUser.photoURL} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full border-2 border-transparent"
                    whileHover={{ borderColor: '#4f46e5' }}
                  />
                ) : (
                  <motion.div 
                    className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center"
                    whileHover={{ backgroundColor: '#e0e7ff' }}
                  >
                    <FaUser className="text-indigo-600" />
                  </motion.div>
                )}
                <span>
                  {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User'}
                </span>
              </motion.button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 20 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10"
                  >
                    <motion.button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      whileHover={{ 
                        backgroundColor: '#f3f4f6',
                        x: 5 
                      }}
                    >
                      <FaSignOutAlt />
                      <span>Log Out</span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

export default Header; 