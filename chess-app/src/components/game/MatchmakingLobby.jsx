import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaChessKnight, FaUserFriends, FaClipboard, FaSearch, FaSpinner, FaArrowLeft } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { socket, socketService } from '../../services/socket';
import { getPlayerRating } from '../../services/ratingService';
import toast from 'react-hot-toast';
import firebase, { 
  firestore, 
  matchmakingQueue, 
  matchesCollection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  where,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from '../../services/firebase';

// Add a component to display offline status and give feedback to the user
const OfflineIndicator = ({ isSearching, onRetry }) => (
  <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center z-50">
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span className="mr-3">Network issues detected. {isSearching ? 'Matchmaking may be unreliable.' : ''}</span>
    <button 
      onClick={onRetry} 
      className="bg-white text-red-500 px-2 py-1 rounded text-sm hover:bg-red-100"
    >
      Retry
    </button>
  </div>
);

function MatchmakingLobby() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('quickMatch');
  const [searching, setSearching] = useState(false);
  const [queueId, setQueueId] = useState(null);
  const [searchTime, setSearchTime] = useState(0);
  const [inviteCode, setInviteCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [playerRating, setPlayerRating] = useState(null);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isJoiningGame, setIsJoiningGame] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const offlineToastShown = useRef(false);
  
  // Check network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (offlineToastShown.current) {
        toast.success('Network connection restored', { id: 'network-status' });
        offlineToastShown.current = false;
        
        // Try to reconnect socket
        if (!socketService.isConnected()) {
          socketService.connect();
        }
      }
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      toast.error('Network connection lost. Some features may be limited.', { 
        id: 'network-status', 
        duration: 5000 
      });
      offlineToastShown.current = true;
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check initial status
    setIsOffline(!navigator.onLine);
    
    // Also listen for socket disconnection
    const unsubscribeSocketDisconnect = socketService.on('disconnect', () => {
      // If we were searching, show a toast
      if (searching) {
        toast.error('Connection to the server lost. Matchmaking paused.', { 
          id: 'socket-disconnect',
          duration: 5000
        });
      }
      setIsOffline(true);
    });
    
    const unsubscribeSocketConnect = socketService.on('connect', () => {
      setIsOffline(false);
    });
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeSocketDisconnect();
      unsubscribeSocketConnect();
    };
  }, [searching]);
  
  // Load player rating on component mount
  useEffect(() => {
    const loadPlayerRating = async () => {
      if (currentUser) {
        try {
          const rating = await getPlayerRating(currentUser.uid);
          setPlayerRating(rating);
        } catch (error) {
          console.error('Error loading player rating:', error);
          // If we get an offline error, show the offline indicator
          if (error.message?.includes('offline')) {
            setIsOffline(true);
          }
        }
      }
    };
    
    loadPlayerRating();
  }, [currentUser]);
  
  // Set up socket listeners for matchmaking
  useEffect(() => {
    // The socketService already handles connection events and global notifications
    
    // Set up game-specific listeners for this component
    const unsubscribeMatchFound = socketService.on('match_found', (data) => {
      console.log('Match found!', data);
      setSearching(false);
      
      // Navigation is handled in the socketService
    });
    
    const unsubscribeQueueUpdate = socketService.on('queue_update', (data) => {
      console.log('Queue position update:', data);
      // You could show this info to the user if needed
    });
    
    const unsubscribeMatchingError = socketService.on('matchmaking_error', (error) => {
      console.error('Matchmaking error:', error);
      setSearching(false);
    });
    
    const unsubscribeMatchmakingLeft = socketService.on('matchmaking_left', (data) => {
      console.log('Left matchmaking queue:', data);
      setQueueId(null);
      setSearching(false);
    });
    
    // Make sure socket is connected
    if (!socketService.isConnected()) {
      socketService.connect();
    }
    
    // Clean up event listeners when component unmounts
    return () => {
      unsubscribeMatchFound();
      unsubscribeQueueUpdate();
      unsubscribeMatchingError();
      unsubscribeMatchmakingLeft();
      
      // Leave matchmaking if still active
      if (searching && currentUser) {
        socketService.leaveMatchmaking(currentUser.uid);
      }
    };
  }, [navigate, searching, currentUser]);
  
  // Timer for search duration
  useEffect(() => {
    let interval;
    if (searching) {
      interval = setInterval(() => {
        setSearchTime(prevTime => prevTime + 1);
      }, 1000);
    } else {
      setSearchTime(0);
    }
    
    return () => clearInterval(interval);
  }, [searching]);
  
  const formatSearchTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Function to retry network operations
  const handleRetryNetworkOperations = async () => {
    if (navigator.onLine) {
      toast.success('Retrying connection...', { duration: 2000 });
      
      if (!socketService.isConnected()) {
        socketService.connect();
      }
      
      // Retry loading player rating
      if (currentUser) {
        try {
          const rating = await getPlayerRating(currentUser.uid);
          setPlayerRating(rating);
          
          // If successful, reset offline state
          setIsOffline(false);
          offlineToastShown.current = false;
        } catch (error) {
          console.error('Error retrying player rating fetch:', error);
          toast.error('Still experiencing connection issues. Please try again later.');
        }
      }
    } else {
      toast.error('No internet connection detected. Please check your network settings.');
    }
  };
  
  const handleFindMatch = async () => {
    if (!currentUser) {
      toast.error('You must be logged in to find a match');
      return;
    }
    
    // If we're offline, show a warning and don't proceed
    if (isOffline) {
      toast.error('Cannot find match when offline. Please check your connection.', { 
        duration: 4000,
        id: 'offline-matchmaking'
      });
      return;
    }
    
    try {
      setSearching(true);
      
      // Get the player's rating
      const rating = playerRating?.rating || 1200;
      
      // Use socket service for matchmaking
      if (socketService.isConnected()) {
        // Use the socketService to join matchmaking
        socketService.joinMatchmaking({
          userId: currentUser.uid,
          displayName: currentUser.displayName || 'Anonymous', 
          rating: rating
        });
        
        // The socket event listeners already set up will handle match found events
      } else {
        // If socket is not connected, try to connect first
        socketService.connect();
        toast.error('Trying to connect to server. Please try again in a moment.');
        setSearching(false);
      }
    } catch (error) {
      console.error('Error starting matchmaking:', error);
      toast.error('Failed to start matchmaking');
      setSearching(false);
    }
  };
  
  const handleCancelSearch = async () => {
    if (currentUser) {
      try {
        setSearching(false); // Stop UI first to prevent flicker
        
        // Use socket service to leave matchmaking
        socketService.leaveMatchmaking(currentUser.uid);
        
        // Clear queue ID
        setQueueId(null);
      } catch (error) {
        console.error('Error canceling search:', error);
        toast.error('Failed to cancel matchmaking');
      }
    }
  };
  
  const handleCreateGame = async () => {
    if (!currentUser) {
      toast.error('You must be logged in to create a game');
      return;
    }
    
    if (isOffline) {
      toast.error('Cannot create game when offline. Please check your connection.');
      return;
    }
    
    try {
      setIsCreatingGame(true);
      
      // Use socket service to create game invite
      socketService.createGameInvite(currentUser.uid);
      
      // This would be handled by a socket.on('game_invite_created') event
      // For now, simulate it with a timeout
      setTimeout(() => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        setGeneratedCode(code);
        setIsCreatingGame(false);
        toast.success('Game created! Share the code with your friend.');
      }, 1000);
      
    } catch (error) {
      console.error('Error creating game:', error);
      toast.error('Failed to create game');
      setIsCreatingGame(false);
    }
  };
  
  const handleJoinGame = async () => {
    if (!currentUser) {
      toast.error('You must be logged in to join a game');
      return;
    }
    
    if (isOffline) {
      toast.error('Cannot join game when offline. Please check your connection.');
      return;
    }
    
    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code');
      return;
    }
    
    try {
      setIsJoiningGame(true);
      
      // Use socket service to join game with code
      socketService.joinGameWithCode(currentUser.uid, inviteCode.trim().toUpperCase());
      
      // This would be handled by a socket.on event
      // The navigation will be handled by the socket service
      
    } catch (error) {
      console.error('Error joining game:', error);
      toast.error(error.message || 'Failed to join game');
      setIsJoiningGame(false);
    }
  };
  
  const copyInviteCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      toast.success('Invite code copied to clipboard!');
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
          <h1 className="text-3xl font-bold text-gray-800">Chess Matchmaking</h1>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            <button
              className={`flex-1 py-4 font-medium text-sm ${
                activeTab === 'quickMatch'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('quickMatch')}
            >
              <div className="flex items-center justify-center">
                <FaSearch className="mr-2" />
                <span>Quick Match</span>
              </div>
            </button>
            <button
              className={`flex-1 py-4 font-medium text-sm ${
                activeTab === 'createGame'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('createGame')}
            >
              <div className="flex items-center justify-center">
                <FaChessKnight className="mr-2" />
                <span>Create Game</span>
              </div>
            </button>
            <button
              className={`flex-1 py-4 font-medium text-sm ${
                activeTab === 'joinGame'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('joinGame')}
            >
              <div className="flex items-center justify-center">
                <FaUserFriends className="mr-2" />
                <span>Join Game</span>
              </div>
            </button>
          </div>
          
          {/* Tab Content */}
          <div className="p-6">
            {/* Quick Match Tab */}
            {activeTab === 'quickMatch' && (
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Find an Opponent</h2>
                  <p className="text-gray-600 mb-2">
                    We'll match you with a player of similar skill level
                  </p>
                  {playerRating && (
                    <div className="flex justify-center items-center gap-2 text-sm font-semibold">
                      <span>Your Rating:</span>
                      <span className="px-2 py-1 bg-indigo-100 rounded text-indigo-800">
                        {playerRating.rating} ({playerRating.rank})
                      </span>
                    </div>
                  )}
                </div>
                
                {searching ? (
                  <div className="text-center">
                    <div className="mb-4 flex justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="text-indigo-600"
                      >
                        <FaSpinner size={32} />
                      </motion.div>
                    </div>
                    <p className="text-lg font-medium text-gray-800 mb-1">Searching for opponents...</p>
                    <p className="text-sm text-gray-600 mb-4">Time elapsed: {formatSearchTime(searchTime)}</p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-6 py-2 bg-red-500 text-white rounded-lg font-medium"
                      onClick={handleCancelSearch}
                    >
                      Cancel
                    </motion.button>
                  </div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center justify-center"
                    onClick={handleFindMatch}
                  >
                    <FaSearch className="mr-2" />
                    Find Match Now
                  </motion.button>
                )}
              </div>
            )}
            
            {/* Create Game Tab */}
            {activeTab === 'createGame' && (
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Create a Game</h2>
                  <p className="text-gray-600">
                    Generate a code to invite a friend to play
                  </p>
                </div>
                
                {generatedCode ? (
                  <div className="text-center">
                    <div className="mb-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                      <p className="text-sm text-gray-600 mb-2">Share this code with your friend:</p>
                      <p className="text-2xl font-mono tracking-wider text-indigo-800 mb-2">{generatedCode}</p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="text-indigo-600 flex items-center justify-center mx-auto"
                        onClick={copyInviteCode}
                      >
                        <FaClipboard className="mr-1" />
                        <span className="text-sm">Copy Code</span>
                      </motion.button>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Waiting for your friend to join. This code is valid for 24 hours.
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium"
                      onClick={() => setGeneratedCode('')}
                    >
                      Create New Game
                    </motion.button>
                  </div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center justify-center"
                    onClick={handleCreateGame}
                    disabled={isCreatingGame}
                  >
                    {isCreatingGame ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="mr-2"
                        >
                          <FaSpinner />
                        </motion.div>
                        Creating Game...
                      </>
                    ) : (
                      <>
                        <FaChessKnight className="mr-2" />
                        Create Private Game
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            )}
            
            {/* Join Game Tab */}
            {activeTab === 'joinGame' && (
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Join a Game</h2>
                  <p className="text-gray-600">
                    Enter a code to join a friend's game
                  </p>
                </div>
                
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Enter 6-character code"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center uppercase"
                    maxLength={6}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                  />
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center justify-center"
                  onClick={handleJoinGame}
                  disabled={isJoiningGame || !inviteCode.trim()}
                >
                  {isJoiningGame ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="mr-2"
                      >
                        <FaSpinner />
                      </motion.div>
                      Joining Game...
                    </>
                  ) : (
                    <>
                      <FaUserFriends className="mr-2" />
                      Join Game
                    </>
                  )}
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {isOffline && <OfflineIndicator isSearching={searching} onRetry={handleRetryNetworkOperations} />}
    </div>
  );
}

export default MatchmakingLobby; 