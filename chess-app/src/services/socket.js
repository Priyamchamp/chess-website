import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { Chess } from 'chess.js';

// Create socket connection to backend server
const socket = io('http://localhost:3002', {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['websocket', 'polling']
});

// Socket service for managing socket events
const socketService = {
  // Connection state
  connected: false,
  
  // Game event callbacks
  gameCallbacks: new Map(),
  
  // Initialize socket and set up global event handlers
  initialize: () => {
    socket.on('connect', () => {
      console.log('Socket connected with ID:', socket.id);
      socketService.connected = true;
      toast.success('Connected to game server');
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      socketService.connected = false;
      toast.error('Disconnected from game server');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error('Connection error: ' + error.message);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      socketService.connected = true;
      toast.success('Reconnected to game server');
    });

    socket.on('reconnect_error', (error) => {
      console.error('Socket reconnect error:', error);
      toast.error('Failed to reconnect to server');
    });

    // Game-specific events
    socket.on('match_found', (data) => {
      console.log('Match found:', data);
      
      // Show toast notification with opponent's name if available
      const opponentName = data.opponentName || 'Anonymous';
      toast.success(`Match found! Playing against ${opponentName}`);
      
      // Remove this if navigation is handled elsewhere
      if (window.location.pathname !== `/game/${data.gameId}`) {
        window.location.href = `/game/${data.gameId}`;
      }
    });

    socket.on('game_invite_created', (data) => {
      console.log('Game invite created:', data);
      toast.success('Game invite created!');
    });

    socket.on('game_started', (data) => {
      console.log('Game started:', data);
      toast.success('Game started!');
    });

    socket.on('matchmaking_error', (error) => {
      console.error('Matchmaking error:', error);
      toast.error(error.message || 'Error during matchmaking');
    });
    
    // Chess game events
    socket.on('move_made', (moveData) => {
      console.log('Move received from server:', moveData);
      if (socketService.gameCallbacks.has('move_made')) {
        socketService.gameCallbacks.get('move_made')(moveData);
      }
    });
    
    socket.on('game_over', (data) => {
      console.log('Game over:', data);
      if (socketService.gameCallbacks.has('game_over')) {
        socketService.gameCallbacks.get('game_over')(data);
      }
    });
    
    socket.on('player_left', (data) => {
      console.log('Player left:', data);
      if (socketService.gameCallbacks.has('player_left')) {
        socketService.gameCallbacks.get('player_left')(data);
      }
    });
  },

  // Emit events with error handling
  emit: (event, data, callback) => {
    if (!socket.connected) {
      console.error('Cannot emit event, socket not connected:', event);
      toast.error('Not connected to server');
            return;
    }
    
    try {
      if (callback) {
        socket.emit(event, data, callback);
      } else {
        socket.emit(event, data);
      }
    } catch (error) {
      console.error('Error emitting event:', event, error);
      toast.error('Error sending data to server');
    }
  },

  // Register event listener
  on: (event, callback) => {
    socket.on(event, callback);
    return () => socket.off(event, callback);
  },

  // Remove event listener
  off: (event, callback) => {
    socket.off(event, callback);
  },

  // Connect manually
  connect: () => {
    if (!socket.connected) {
      socket.connect();
    }
  },

  // Disconnect manually
  disconnect: () => {
    if (socket.connected) {
      socket.disconnect();
    }
  },
  
  // Join matchmaking queue
  joinMatchmaking: (userData) => {
    socketService.emit('join_matchmaking', userData);
    toast.success('Searching for a match...');
  },
  
  // Leave matchmaking queue
  leaveMatchmaking: (userId) => {
    socketService.emit('leave_matchmaking', { userId });
    toast.success('Matchmaking cancelled');
  },
  
  // Create a game invite
  createGameInvite: (userId) => {
    socketService.emit('create_game_invite', { creatorId: userId });
  },
  
  // Join a game with invite code
  joinGameWithCode: (userId, code) => {
    socketService.emit('join_game_with_code', { userId, code });
  },
  
  // Make a chess move
  makeMove: (gameId, userId, move) => {
    return new Promise((resolve, reject) => {
      if (!socket.connected) {
        reject(new Error('Socket not connected'));
          return;
        }
      
      const moveData = {
        gameId,
        userId,
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q',
        timestamp: Date.now()
      };
      
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error('Move timeout - no response from server'));
      }, 5000);
      
      socket.emit('make_move', moveData, (response) => {
        clearTimeout(timeout);
        
        if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Move rejected'));
        }
      });
    });
  },
  
  // Register move callback
  onMoveMade: (callback) => {
    if (callback) {
      socketService.gameCallbacks.set('move_made', callback);
    } else {
      socketService.gameCallbacks.delete('move_made');
    }
  },
  
  // Register game over callback  
  onGameOver: (callback) => {
    if (callback) {
      socketService.gameCallbacks.set('game_over', callback);
    } else {
      socketService.gameCallbacks.delete('game_over');
    }
  },
  
  // Register player left callback
  onPlayerLeft: (callback) => {
    if (callback) {
      socketService.gameCallbacks.set('player_left', callback);
    } else {
      socketService.gameCallbacks.delete('player_left');
    }
  },
  
  // Check if socket is connected
  isConnected: () => {
    return socket.connected;
  }
};

// Initialize the socket service
socketService.initialize();

export { socket, socketService };

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (socketService.socket && socketService.socket.connected) {
    socketService.socket.disconnect();
  }
});