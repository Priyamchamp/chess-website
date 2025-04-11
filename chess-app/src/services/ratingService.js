import { db } from '../config/firebase';
import { doc, getDoc, updateDoc, setDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

// Collection for player ratings
const PLAYER_RATINGS = 'player_ratings';
const LEADERBOARD = 'leaderboard';

// Local cache for player ratings (used as a fallback when Firestore is offline)
const ratingCache = {};
const leaderboardCache = [];

// Define rank tiers based on ELO rating
const RANK_TIERS = [
  { name: 'Bronze', minRating: 0, maxRating: 1199 },
  { name: 'Silver', minRating: 1200, maxRating: 1399 },
  { name: 'Gold', minRating: 1400, maxRating: 1599 },
  { name: 'Platinum', minRating: 1600, maxRating: 1799 },
  { name: 'Diamond', minRating: 1800, maxRating: 1999 },
  { name: 'Master', minRating: 2000, maxRating: 2199 },
  { name: 'Grandmaster', minRating: 2200, maxRating: 9999 }
];

/**
 * Get or initialize a player's rating
 * @param {string} userId - The player's user ID
 * @returns {Promise<object>} - The player's rating data
 */
export const getPlayerRating = async (userId) => {
  try {
    // First check local cache
    if (ratingCache[userId]) {
      console.log('Returning player rating from cache:', userId);
      return ratingCache[userId];
    }
    
    // Try to get from Firestore
    const ratingRef = doc(db, PLAYER_RATINGS, userId);
    const ratingSnap = await getDoc(ratingRef);
    
    if (ratingSnap.exists()) {
      const ratingData = ratingSnap.data();
      // Update local cache
      ratingCache[userId] = ratingData;
      return ratingData;
    } else {
      // Initialize rating for new player
      const initialRating = {
        rating: 1200,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        rank: getRankFromRating(1200),
        lastUpdated: new Date()
      };
      
      try {
        await setDoc(ratingRef, initialRating);
      } catch (error) {
        console.warn('Failed to save initial rating to Firestore, using local cache only:', error);
      }
      
      // Store in cache regardless of Firestore success
      ratingCache[userId] = initialRating;
      return initialRating;
    }
  } catch (error) {
    console.error('Error getting player rating:', error);
    
    // If we have a cached version, return it as a fallback
    if (ratingCache[userId]) {
      console.log('Returning cached rating due to Firestore error');
      return ratingCache[userId];
    }
    
    // If no cached version, create a default rating and cache it
    const defaultRating = {
      rating: 1200,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      rank: 'Silver',
      lastUpdated: new Date(),
      isOfflineGenerated: true // Flag to indicate this was generated offline
    };
    
    ratingCache[userId] = defaultRating;
    return defaultRating;
  }
};

/**
 * Get the rank name based on a rating value
 * @param {number} rating - ELO rating
 * @returns {string} - Rank name
 */
export const getRankFromRating = (rating) => {
  for (const tier of RANK_TIERS) {
    if (rating >= tier.minRating && rating <= tier.maxRating) {
      return tier.name;
    }
  }
  return 'Unranked';
};

/**
 * Calculate ELO rating changes after a game
 * @param {number} playerRating - Player's current rating
 * @param {number} opponentRating - Opponent's current rating
 * @param {number} result - Game result (1 for win, 0.5 for draw, 0 for loss)
 * @returns {number} - Rating change
 */
export const calculateEloChange = (playerRating, opponentRating, result) => {
  // K-factor determines the maximum possible rating change
  // Higher K means more volatile ratings
  const K = 32;
  
  // Calculate expected outcome based on ELO formula
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  
  // Calculate rating change
  const ratingChange = Math.round(K * (result - expectedScore));
  
  return ratingChange;
};

/**
 * Update player ratings after a game
 * @param {string} whiteId - White player's user ID
 * @param {string} blackId - Black player's user ID
 * @param {string} result - Game result ('white', 'black', or 'draw')
 * @returns {Promise<object>} - Rating changes
 */
export const updateRatings = async (whiteId, blackId, result) => {
  try {
    // Get current ratings
    const whiteRating = await getPlayerRating(whiteId);
    const blackRating = await getPlayerRating(blackId);
    
    // Convert result to numerical values for ELO calculation
    let whiteResult, blackResult;
    
    if (result === 'white') {
      whiteResult = 1;
      blackResult = 0;
    } else if (result === 'black') {
      whiteResult = 0;
      blackResult = 1;
    } else { // draw
      whiteResult = 0.5;
      blackResult = 0.5;
    }
    
    // Calculate rating changes
    const whiteRatingChange = calculateEloChange(whiteRating.rating, blackRating.rating, whiteResult);
    const blackRatingChange = calculateEloChange(blackRating.rating, whiteRating.rating, blackResult);
    
    // Update white player rating
    const newWhiteRating = whiteRating.rating + whiteRatingChange;
    const updatedWhiteRating = {
      rating: newWhiteRating,
      gamesPlayed: whiteRating.gamesPlayed + 1,
      wins: whiteResult === 1 ? whiteRating.wins + 1 : whiteRating.wins,
      losses: whiteResult === 0 ? whiteRating.losses + 1 : whiteRating.losses,
      draws: whiteResult === 0.5 ? whiteRating.draws + 1 : whiteRating.draws,
      rank: getRankFromRating(newWhiteRating),
      lastUpdated: new Date()
    };
    
    // Update black player rating
    const newBlackRating = blackRating.rating + blackRatingChange;
    const updatedBlackRating = {
      rating: newBlackRating,
      gamesPlayed: blackRating.gamesPlayed + 1,
      wins: blackResult === 1 ? blackRating.wins + 1 : blackRating.wins,
      losses: blackResult === 0 ? blackRating.losses + 1 : blackRating.losses,
      draws: blackResult === 0.5 ? blackRating.draws + 1 : blackRating.draws,
      rank: getRankFromRating(newBlackRating),
      lastUpdated: new Date()
    };
    
    // Update local cache immediately
    ratingCache[whiteId] = updatedWhiteRating;
    ratingCache[blackId] = updatedBlackRating;
    
    // Try to update Firestore
    try {
      const whiteRatingRef = doc(db, PLAYER_RATINGS, whiteId);
      await updateDoc(whiteRatingRef, updatedWhiteRating);
      
      const blackRatingRef = doc(db, PLAYER_RATINGS, blackId);
      await updateDoc(blackRatingRef, updatedBlackRating);
      
      // Update leaderboard if needed
      await updateLeaderboardIfNeeded(whiteId, newWhiteRating);
      await updateLeaderboardIfNeeded(blackId, newBlackRating);
    } catch (error) {
      console.error('Error updating ratings in Firestore (changes stored in local cache):', error);
      // Changes are already in local cache, so we can continue
    }
    
    return {
      white: {
        oldRating: whiteRating.rating,
        newRating: newWhiteRating,
        change: whiteRatingChange
      },
      black: {
        oldRating: blackRating.rating,
        newRating: newBlackRating,
        change: blackRatingChange
      }
    };
  } catch (error) {
    console.error('Error in rating update process:', error);
    throw error;
  }
};

/**
 * Update the leaderboard if a player's rating is high enough
 * @param {string} userId - Player's user ID
 * @param {number} rating - Player's new rating
 * @returns {Promise<void>}
 */
export const updateLeaderboardIfNeeded = async (userId, rating) => {
  try {
    // Only consider players with at least 1600 rating for leaderboard
    if (rating < 1600) {
      return;
    }
    
    // Get player profile
    const userProfileRef = doc(db, 'users', userId);
    let gamingName = 'Anonymous Player';
    
    try {
      const userProfileSnap = await getDoc(userProfileRef);
      if (userProfileSnap.exists()) {
        const userProfile = userProfileSnap.data();
        gamingName = userProfile.gamingName || gamingName;
      }
    } catch (error) {
      console.warn('Could not fetch user profile, using default name:', error);
      // Continue with default name
    }
    
    // Create leaderboard entry
    const leaderboardEntry = {
      userId,
      gamingName,
      rating,
      rank: getRankFromRating(rating),
      updatedAt: new Date()
    };
    
    // Update local leaderboard cache
    const existingEntryIndex = leaderboardCache.findIndex(entry => entry.userId === userId);
    if (existingEntryIndex >= 0) {
      leaderboardCache[existingEntryIndex] = leaderboardEntry;
    } else {
      leaderboardCache.push(leaderboardEntry);
      // Sort leaderboard by rating
      leaderboardCache.sort((a, b) => b.rating - a.rating);
    }
    
    // Try to update Firestore
    try {
      const leaderboardRef = doc(db, LEADERBOARD, userId);
      await setDoc(leaderboardRef, leaderboardEntry);
    } catch (error) {
      console.error('Error updating leaderboard in Firestore (changes stored in local cache):', error);
      // Continue with local cache
    }
  } catch (error) {
    console.error('Error in leaderboard update process:', error);
    // Don't throw the error to prevent disrupting the rating update
  }
};

/**
 * Get the top players from the leaderboard
 * @param {number} count - Number of top players to retrieve
 * @returns {Promise<Array>} - Array of top players
 */
export const getTopPlayers = async (count = 10) => {
  try {
    // Try to get from Firestore
    const leaderboardQuery = query(
      collection(db, LEADERBOARD),
      orderBy('rating', 'desc'),
      limit(count)
    );
    
    const querySnapshot = await getDocs(leaderboardQuery);
    const topPlayers = [];
    
    querySnapshot.forEach((doc) => {
      const playerData = doc.data();
      topPlayers.push(playerData);
      
      // Update local cache
      const existingEntryIndex = leaderboardCache.findIndex(entry => entry.userId === playerData.userId);
      if (existingEntryIndex >= 0) {
        leaderboardCache[existingEntryIndex] = playerData;
      } else {
        leaderboardCache.push(playerData);
      }
    });
    
    // Sort the cache
    leaderboardCache.sort((a, b) => b.rating - a.rating);
    
    return topPlayers;
  } catch (error) {
    console.error('Error getting top players from Firestore:', error);
    
    // Return from cache as fallback
    console.log('Returning leaderboard from local cache');
    return leaderboardCache.slice(0, count);
  }
}; 