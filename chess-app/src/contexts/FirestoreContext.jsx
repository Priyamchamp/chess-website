import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';

// Create the Firestore context
const FirestoreContext = createContext();

/**
 * Hook for using the Firestore context
 */
export const useFirestore = () => {
  return useContext(FirestoreContext);
};

/**
 * Provider component for Firestore functionality
 */
export const FirestoreProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [userGames, setUserGames] = useState([]);
  const [activeGameRooms, setActiveGameRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Listen for active game rooms
  useEffect(() => {
    if (!currentUser) {
      setUserGames([]);
      setActiveGameRooms([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Query for active game rooms where the current user is a player
      const gamesQuery = query(
        collection(db, 'game_rooms'),
        where('status', '==', 'active')
      );

      // Create a real-time listener
      const unsubscribe = onSnapshot(
        gamesQuery,
        (snapshot) => {
          const games = [];
          snapshot.forEach((doc) => {
            const gameData = doc.data();
            
            // Check if current user is a player in this game
            const isPlayerInGame = gameData.players && 
              gameData.players.some(player => player.userId === currentUser.uid);
            
            if (isPlayerInGame) {
              games.push({
                id: doc.id,
                ...gameData
              });
            }
          });
          
          setUserGames(games);
          setActiveGameRooms(games);
          setIsLoading(false);
        },
        (err) => {
          console.error('Error getting active games:', err);
          setError(err.message);
          setIsLoading(false);
        }
      );

      // Clean up the listener when the component unmounts
      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up games listener:', err);
      setError(err.message);
      setIsLoading(false);
    }
  }, [currentUser]);

  // Value to be provided to consumers
  const value = {
    userGames,
    activeGameRooms,
    isLoading,
    error
  };

  return (
    <FirestoreContext.Provider value={value}>
      {children}
    </FirestoreContext.Provider>
  );
};

export default FirestoreContext; 