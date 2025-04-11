import { db } from '../config/firebase';
import { collection, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

// Collection names
const MATCHMAKING_QUEUE = 'matchmaking_queue';
const GAME_ROOMS = 'game_rooms';
const GAME_INVITES = 'game_invites';

// Cache for matchmaking data in case Firestore is offline
const localCache = {
  queueEntries: {},
  gameRooms: {},
  gameInvites: {}
};

// Maximum number of retries for Firestore operations
const MAX_RETRIES = 3;

// Flag to track Firestore connection status
let isFirestoreOffline = false;

// Retry a Firestore operation with exponential backoff
const retryOperation = async (operation, maxRetries = MAX_RETRIES) => {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // If we know Firestore is offline, throw early
      if (isFirestoreOffline && attempt === 0) {
        throw new Error('Firestore is offline based on previous connection attempts');
      }
      
      const result = await operation();
      
      // Successfully executed operation, reset offline flag
      if (isFirestoreOffline) {
        console.log('Firestore connection restored');
        isFirestoreOffline = false;
      }
      
      return result;
    } catch (error) {
      console.warn(`Firestore operation failed (attempt ${attempt + 1}/${maxRetries}):`, error);
      lastError = error;
      
      // Check if it's an offline error
      if (error.message && (
        error.message.includes('offline') || 
        error.message.includes('network') ||
        error.code === 'failed-precondition')
      ) {
        isFirestoreOffline = true;
        console.warn('Firestore appears to be offline');
      }
      
      // Exponential backoff - wait longer between consecutive retries
      const delayMs = Math.min(1000 * (2 ** attempt), 10000);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw lastError; // If we've exhausted all retries, throw the last error
};

/**
 * Add a player to the matchmaking queue
 * @param {string} userId - User ID of the player
 * @param {number} rating - ELO rating of the player (default 1200)
 * @param {object} preferences - Game preferences (time control, etc.)
 * @returns {Promise<string>} - Queue entry ID
 */
export const joinMatchmaking = async (userId, rating = 1200, preferences = {}) => {
  try {
    // Create queue entry with timestamp for FIFO ordering
    const queueEntry = {
      userId,
      rating,
      preferences,
      timestamp: new Date().toISOString(), // Use local timestamp since serverTimestamp may not work offline
      status: 'searching'
    };
    
    // Generate a client-side ID for offline support
    const clientGeneratedId = `queue_${Date.now()}_${userId.substring(0, 8)}`;
    
    try {
      // Use retry logic for adding to matchmaking queue
      const docRef = await retryOperation(() => 
        addDoc(collection(db, MATCHMAKING_QUEUE), queueEntry)
      );
      
      // Store in local cache
      const actualId = docRef.id || clientGeneratedId;
      localCache.queueEntries[actualId] = { 
        ...queueEntry, 
        id: actualId
      };
      
      console.log('Successfully joined matchmaking queue with ID:', actualId);
      return actualId;
    } catch (error) {
      // If Firestore fails, use local cache as fallback
      if (isFirestoreOffline) {
        console.log('Using local cache for matchmaking queue entry');
        localCache.queueEntries[clientGeneratedId] = { 
          ...queueEntry,
          id: clientGeneratedId
        };
        return clientGeneratedId;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error joining matchmaking:', error);
    throw new Error(`Failed to join matchmaking: ${error.message}`);
  }
};

/**
 * Remove a player from the matchmaking queue
 * @param {string} queueId - ID of the queue entry
 */
export const leaveMatchmaking = async (queueId) => {
  try {
    // Try Firestore first
    if (!isFirestoreOffline) {
      await retryOperation(() => 
        deleteDoc(doc(db, MATCHMAKING_QUEUE, queueId))
      );
    }
    
    // Also remove from local cache
    if (localCache.queueEntries[queueId]) {
      delete localCache.queueEntries[queueId];
    }
    
    console.log('Successfully left matchmaking queue:', queueId);
    return true;
  } catch (error) {
    console.error('Error leaving matchmaking:', error);
    
    // If Firestore fails but we have the entry locally, still consider it a success
    if (isFirestoreOffline && localCache.queueEntries[queueId]) {
      delete localCache.queueEntries[queueId];
      return true;
    }
    
    throw new Error(`Failed to leave matchmaking: ${error.message}`);
  }
};

/**
 * Find a match for a player based on rating
 * @param {string} userId - User ID of the player
 * @param {number} rating - ELO rating of the player
 * @param {object} preferences - Game preferences
 * @param {string} queueEntryId - Current user's queue entry ID 
 * @returns {Promise<object|null>} - Match data or null if no match found
 */
export const findMatch = async (userId, rating = 1200, preferences = {}, queueEntryId = null) => {
  try {
    console.log(`Finding match for user ${userId} with rating ${rating}`);
    
    // Define rating range (±200 points)
    const minRating = rating - 200;
    const maxRating = rating + 200;
    
    let opponentData = null;
    let opponentId = null;
    
    if (!isFirestoreOffline) {
      try {
        // Query for potential opponents in a similar rating range
        // We can't use multiple inequality filters on different fields in Firestore,
        // so we need to structure our query differently.
        // First, get all searching players and filter them in memory
        
        const q = query(
          collection(db, MATCHMAKING_QUEUE),
          where('status', '==', 'searching')
        );
        
        console.log('Executing matchmaking query...');
        // Use retry logic for querying potential opponents
        const querySnapshot = await retryOperation(() => getDocs(q));
        
        if (!querySnapshot.empty) {
          console.log(`Found ${querySnapshot.size} players in matchmaking queue`);
          
          // Filter potential opponents who match our criteria
          const potentialOpponents = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Skip the current user and check rating range
            if (data.userId !== userId && 
                data.rating >= minRating && 
                data.rating <= maxRating) {
              potentialOpponents.push({
                id: doc.id,
                ...data
              });
            }
          });
          
          console.log(`Found ${potentialOpponents.length} potential matches in rating range`);
          
          if (potentialOpponents.length > 0) {
            // Sort by timestamp to get the longest waiting player
            potentialOpponents.sort((a, b) => {
              const aTime = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
              const bTime = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
              return aTime - bTime;
            });
            
            const opponent = potentialOpponents[0];
            opponentData = opponent;
            opponentId = opponent.id;
            
            console.log(`Selected opponent: ${opponent.userId} with rating ${opponent.rating}`);
          }
        } else {
          console.log('No players found in matchmaking queue');
        }
      } catch (error) {
        console.error('Firestore query failed, falling back to local cache:', error);
        // Will fall back to local cache logic below
      }
    }
    
    // If no match found in Firestore or Firestore is offline, check local cache
    if (!opponentData && Object.keys(localCache.queueEntries).length > 0) {
      console.log('Searching for match in local cache');
      
      // Find a suitable opponent in local cache
      const potentialOpponents = Object.values(localCache.queueEntries).filter(entry => 
        entry.userId !== userId &&
        entry.status === 'searching' &&
        entry.rating >= minRating &&
        entry.rating <= maxRating
      );
      
      if (potentialOpponents.length > 0) {
        // Sort by timestamp to get the longest waiting player
        potentialOpponents.sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        );
        
        opponentData = potentialOpponents[0];
        opponentId = opponentData.id;
        console.log(`Found opponent in local cache: ${opponentData.userId}`);
      }
    }
    
    if (!opponentData) {
      // No suitable opponent found
      console.log('No suitable opponent found');
      return null;
    }
    
    console.log(`Creating game room between ${userId} and ${opponentData.userId}`);
    
    // Create a new game room with retry logic
    const gameId = await createGameRoom(userId, opponentData.userId, preferences);
    
    // Update both players' status in the matchmaking queue
    
    // Update current player's status
    if (queueEntryId) {
      const userQueueRef = doc(db, MATCHMAKING_QUEUE, queueEntryId);
      try {
        await retryOperation(() => 
          updateDoc(userQueueRef, {
            status: 'matched',
            gameId
          })
        );
      } catch (error) {
        console.error('Failed to update current player status:', error);
        // Continue anyway as we want to update the opponent
      }
    }
    
    // Update opponent's status
    if (!isFirestoreOffline) {
      try {
        await retryOperation(() => 
          updateDoc(doc(db, MATCHMAKING_QUEUE, opponentId), {
            status: 'matched',
            gameId
          })
        );
      } catch (error) {
        console.error('Failed to update opponent status in Firestore:', error);
      }
    }
    
    // Also update in local cache
    if (localCache.queueEntries[opponentId]) {
      localCache.queueEntries[opponentId].status = 'matched';
      localCache.queueEntries[opponentId].gameId = gameId;
    }
    
    console.log('Match created successfully with game ID:', gameId);
    
    return {
      gameId,
      opponent: opponentData.userId,
      opponentRating: opponentData.rating
    };
  } catch (error) {
    console.error('Error finding match:', error);
    throw new Error(`Failed to find match: ${error.message}`);
  }
};

/**
 * Create a new game room between two players
 * @param {string} whitePlayerId - User ID of the white player
 * @param {string} blackPlayerId - User ID of the black player
 * @param {object} preferences - Game preferences
 * @returns {Promise<string>} - Game room ID
 */
export const createGameRoom = async (player1Id, player2Id, preferences = {}) => {
  try {
    // Randomly assign colors
    const isPlayer1White = Math.random() > 0.5;
    const whitePlayerId = isPlayer1White ? player1Id : player2Id;
    const blackPlayerId = isPlayer1White ? player2Id : player1Id;
    
    // Default time control: 10 minutes per player
    const timeControl = preferences.timeControl || 600;
    
    const gameRoom = {
      whitePlayerId,
      blackPlayerId,
      timeControl,
      startedAt: serverTimestamp(),
      status: 'active',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Initial position
      moves: [],
      currentTurn: 'w'
    };
    
    // Create game room with custom ID for easy access
    const gameId = `game_${Date.now()}_${uuidv4().substring(0, 8)}`;
    await setDoc(doc(db, GAME_ROOMS, gameId), gameRoom);
    
    return gameId;
  } catch (error) {
    console.error('Error creating game room:', error);
    throw error;
  }
};

/**
 * Generate a short, shareable game invite code
 * @param {string} creatorId - User ID of the person creating the invite
 * @param {object} preferences - Game preferences
 * @returns {Promise<string>} - Invite code
 */
export const createGameInvite = async (creatorId, preferences = {}) => {
  try {
    // Generate a short, human-readable code (6 characters)
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar-looking characters
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Store the invite in Firestore
    const invite = {
      code,
      creatorId,
      preferences,
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hour expiration
      status: 'pending'
    };
    
    await setDoc(doc(db, GAME_INVITES, code), invite);
    
    return code;
  } catch (error) {
    console.error('Error creating game invite:', error);
    throw error;
  }
};

/**
 * Join a game using an invite code
 * @param {string} code - Invite code
 * @param {string} userId - User ID of the player joining
 * @returns {Promise<object>} - Game data
 */
export const joinGameWithCode = async (code, userId) => {
  try {
    // Validate code format
    if (!code || typeof code !== 'string' || code.length !== 6) {
      throw new Error('Invalid invite code format');
    }
    
    // Get the invite
    const inviteRef = doc(db, GAME_INVITES, code);
    const inviteSnap = await getDoc(inviteRef);
    
    if (!inviteSnap.exists()) {
      throw new Error('Invite code not found');
    }
    
    const invite = inviteSnap.data();
    
    // Check if invite is expired
    if (invite.expiresAt.toDate() < new Date()) {
      throw new Error('Invite code has expired');
    }
    
    // Check if invite is already used
    if (invite.status !== 'pending') {
      throw new Error('This invite has already been used');
    }
    
    // Prevent joining your own invite
    if (invite.creatorId === userId) {
      throw new Error('You cannot join your own game invite');
    }
    
    // Create game room
    const gameId = await createGameRoom(invite.creatorId, userId, invite.preferences);
    
    // Update invite status
    await updateDoc(inviteRef, {
      status: 'accepted',
      joinedBy: userId,
      gameId
    });
    
    return {
      gameId,
      creatorId: invite.creatorId
    };
  } catch (error) {
    console.error('Error joining game with code:', error);
    throw error;
  }
};

/**
 * Subscribe to game room updates
 * @param {string} gameId - ID of the game room
 * @param {function} callback - Function to call with updated game data
 * @returns {function} - Unsubscribe function
 */
export const subscribeToGameRoom = (gameId, callback) => {
  try {
    const gameRef = doc(db, GAME_ROOMS, gameId);
    
    return onSnapshot(gameRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data());
      } else {
        callback(null);
      }
    });
  } catch (error) {
    console.error('Error subscribing to game room:', error);
    throw error;
  }
};

/**
 * Update game state with a new move
 * @param {string} gameId - ID of the game room
 * @param {string} fen - FEN notation of the new position
 * @param {object} move - Move object with from, to, etc.
 * @returns {Promise<void>}
 */
export const updateGameState = async (gameId, fen, move) => {
  try {
    const gameRef = doc(db, GAME_ROOMS, gameId);
    const gameSnap = await getDoc(gameRef);
    
    if (!gameSnap.exists()) {
      throw new Error('Game not found');
    }
    
    const game = gameSnap.data();
    const moves = [...game.moves, move];
    
    // Toggle current turn
    const currentTurn = game.currentTurn === 'w' ? 'b' : 'w';
    
    await updateDoc(gameRef, {
      fen,
      moves,
      lastMove: move,
      currentTurn,
      lastMoveTime: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating game state:', error);
    throw error;
  }
};

/**
 * End a game and update player ratings
 * @param {string} gameId - ID of the game room
 * @param {string} winnerId - User ID of the winner (null for draw)
 * @returns {Promise<void>}
 */
export const endGame = async (gameId, winnerId = null) => {
  try {
    const gameRef = doc(db, GAME_ROOMS, gameId);
    const gameSnap = await getDoc(gameRef);
    
    if (!gameSnap.exists()) {
      throw new Error('Game not found');
    }
    
    const game = gameSnap.data();
    
    // Set game as completed with result
    let result;
    if (winnerId === null) {
      result = 'draw';
    } else if (winnerId === game.whitePlayerId) {
      result = 'white';
    } else if (winnerId === game.blackPlayerId) {
      result = 'black';
    } else {
      throw new Error('Invalid winner ID');
    }
    
    await updateDoc(gameRef, {
      status: 'completed',
      result,
      endedAt: serverTimestamp()
    });
    
    // Calculate and update ELO ratings (to be implemented)
    if (winnerId !== null) {
      await updatePlayerRatings(game.whitePlayerId, game.blackPlayerId, result);
    } else {
      await updatePlayerRatings(game.whitePlayerId, game.blackPlayerId, 'draw');
    }
  } catch (error) {
    console.error('Error ending game:', error);
    throw error;
  }
};

/**
 * Update players' ELO ratings after a game
 * @param {string} whitePlayerId - User ID of the white player
 * @param {string} blackPlayerId - User ID of the black player
 * @param {string} result - Game result: 'white', 'black', or 'draw'
 * @returns {Promise<void>}
 */
export const updatePlayerRatings = async (whitePlayerId, blackPlayerId, result) => {
  // To be implemented with ELO calculation logic
  // This is a placeholder for future implementation
  console.log('Rating update needed for', whitePlayerId, blackPlayerId, result);
}; 