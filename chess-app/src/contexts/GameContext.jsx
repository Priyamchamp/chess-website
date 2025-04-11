import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import firebase, { 
  firestore, 
  matchesCollection,
  usersCollection,
  doc, 
  getDoc, 
  updateDoc, 
  collection,
  where,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  arrayUnion
} from '../services/firebase';
import toast from 'react-hot-toast';

const GameContext = createContext();

export function useGame() {
  return useContext(GameContext);
}

export function GameProvider({ children }) {
  const { currentUser } = useAuth();
  const [activeGame, setActiveGame] = useState(null);
  const [activeGameId, setActiveGameId] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [opponent, setOpponent] = useState(null);
  const [gameState, setGameState] = useState(null);
  
  // Listen for active game when user is authenticated
  useEffect(() => {
    if (!currentUser) return;
    
    // ONLY try to fetch active game if explicitly requested
    // Don't automatically load a game on login
    setIsLoading(false);
    setActiveGame(null);
    setActiveGameId(null);
    setPlayerColor(null);
    setOpponent(null);
    setGameState(null);
    
    // Commenting out automatic game loading
    /*
    setIsLoading(true);
    
    // Query for active games involving the current user
    // Simplify query to avoid requiring a composite index
    const activeGamesQuery = query(
      matchesCollection,
      where(`players.${currentUser.uid}`, '==', true),
      where('status', '==', 'active')
    );
    
    const unsubscribe = onSnapshot(activeGamesQuery, snapshot => {
      if (snapshot.empty) {
        // No active game
        setActiveGame(null);
        setActiveGameId(null);
        setPlayerColor(null);
        setOpponent(null);
        setGameState(null);
        setIsLoading(false);
        return;
      }
      
      // We might have multiple active games, find the most recent one
      let mostRecentGame = null;
      let mostRecentGameId = null;
      let mostRecentTimestamp = 0;
      
      snapshot.forEach(doc => {
        const gameData = doc.data();
        const timestamp = gameData.createdAt?.toMillis() || 0;
        
        if (timestamp > mostRecentTimestamp) {
          mostRecentGame = gameData;
          mostRecentGameId = doc.id;
          mostRecentTimestamp = timestamp;
        }
      });
      
      if (!mostRecentGame) {
        setIsLoading(false);
        return;
      }
      
      // Set active game data
      setActiveGame(mostRecentGame);
      setActiveGameId(mostRecentGameId);
      
      // Set player color
      if (mostRecentGame.colors) {
        setPlayerColor(mostRecentGame.colors[currentUser.uid]);
      }
      
      // Set game state
      if (mostRecentGame.game) {
        setGameState(mostRecentGame.game);
      }
      
      // Find opponent
      const players = Object.keys(mostRecentGame.players);
      const opponentId = players.find(id => id !== currentUser.uid);
      
      if (opponentId) {
        // Get opponent details
        getDoc(doc(usersCollection, opponentId))
          .then(userDoc => {
            if (userDoc.exists()) {
              setOpponent(userDoc.data());
            } else {
              setOpponent({ uid: opponentId, displayName: 'Anonymous' });
            }
          })
          .catch(error => {
            console.error('Error fetching opponent details:', error);
            setOpponent({ uid: opponentId, displayName: 'Anonymous' });
          });
      }
      
      setIsLoading(false);
    }, error => {
      console.error('Error listening for active games:', error);
      toast.error('Error loading active games');
      setIsLoading(false);
    });
    
    return () => unsubscribe();
    */
  }, [currentUser]);
  
  // Function to make a move
  const makeMove = async (from, to) => {
    if (!activeGameId || !currentUser || !gameState) {
      return { success: false, error: 'No active game' };
    }
    
    try {
      // Check if it's the player's turn
      if (gameState.currentTurn !== currentUser.uid) {
        return { success: false, error: 'Not your turn' };
      }
      
      // Get game reference
      const gameRef = doc(matchesCollection, activeGameId);
      
      // Update the game state with the new move
      const moveData = {
        from,
        to,
        player: currentUser.uid,
        timestamp: serverTimestamp()
      };
      
      // Find opponent
      const players = Object.keys(activeGame.players);
      const opponentId = players.find(id => id !== currentUser.uid);
      
      await updateDoc(gameRef, {
        'game.history': arrayUnion(moveData),
        'game.lastMove': moveData,
        'game.currentTurn': opponentId
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error making move:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Function to forfeit the game
  const forfeitGame = async () => {
    if (!activeGameId || !currentUser) {
      return { success: false, error: 'No active game' };
    }
    
    try {
      const gameRef = doc(matchesCollection, activeGameId);
      
      await updateDoc(gameRef, {
        status: 'completed',
        result: {
          winner: opponent?.uid,
          reason: 'forfeit'
        }
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error forfeiting game:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Function to load active games on demand
  const loadActiveGames = () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    
    // Query for active games involving the current user
    const activeGamesQuery = query(
      matchesCollection,
      where(`players.${currentUser.uid}`, '==', true),
      where('status', '==', 'active')
    );
    
    const unsubscribe = onSnapshot(activeGamesQuery, snapshot => {
      if (snapshot.empty) {
        // No active game
        setActiveGame(null);
        setActiveGameId(null);
        setPlayerColor(null);
        setOpponent(null);
        setGameState(null);
        setIsLoading(false);
        return;
      }
      
      // We might have multiple active games, find the most recent one
      let mostRecentGame = null;
      let mostRecentGameId = null;
      let mostRecentTimestamp = 0;
      
      snapshot.forEach(doc => {
        const gameData = doc.data();
        const timestamp = gameData.createdAt?.toMillis() || 0;
        
        if (timestamp > mostRecentTimestamp) {
          mostRecentGame = gameData;
          mostRecentGameId = doc.id;
          mostRecentTimestamp = timestamp;
        }
      });
      
      if (!mostRecentGame) {
        setIsLoading(false);
        return;
      }
      
      // Set active game data
      setActiveGame(mostRecentGame);
      setActiveGameId(mostRecentGameId);
      
      // Set player color
      if (mostRecentGame.colors) {
        setPlayerColor(mostRecentGame.colors[currentUser.uid]);
      }
      
      // Set game state
      if (mostRecentGame.game) {
        setGameState(mostRecentGame.game);
      }
      
      // Find opponent
      const players = Object.keys(mostRecentGame.players);
      const opponentId = players.find(id => id !== currentUser.uid);
      
      if (opponentId) {
        // Get opponent details
        getDoc(doc(usersCollection, opponentId))
          .then(userDoc => {
            if (userDoc.exists()) {
              setOpponent(userDoc.data());
            } else {
              setOpponent({ uid: opponentId, displayName: 'Anonymous' });
            }
          })
          .catch(error => {
            console.error('Error fetching opponent details:', error);
            setOpponent({ uid: opponentId, displayName: 'Anonymous' });
          });
      }
      
      setIsLoading(false);
    }, error => {
      console.error('Error listening for active games:', error);
      toast.error('Error loading active games');
      setIsLoading(false);
    });
    
    return unsubscribe;
  };
  
  const value = {
    activeGame,
    activeGameId,
    playerColor,
    isLoading,
    opponent,
    gameState,
    makeMove,
    forfeitGame,
    loadActiveGames,
    hasActiveGame: !!activeGame
  };
  
  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export default GameContext; 