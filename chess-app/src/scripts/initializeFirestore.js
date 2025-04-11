import { db } from '../config/firebase';
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Initializes Firestore with sample data for the chess application
 * This includes creating sample players, ratings, and a game room
 */
const initializeFirestore = async () => {
  try {
    console.log('Initializing Firestore with sample data...');
    
    // Create sample players
    const players = [
      { id: 'player1', name: 'Chess Master', rating: 1800 },
      { id: 'player2', name: 'Casual Player', rating: 1200 },
      { id: 'player3', name: 'Beginner', rating: 900 }
    ];
    
    // Add player ratings
    for (const player of players) {
      await setDoc(doc(db, 'player_ratings', player.id), {
        userId: player.id,
        gamingName: player.name,
        rating: player.rating,
        gamesPlayed: 5,
        wins: 2,
        losses: 2,
        draws: 1,
        rank: player.rating >= 1800 ? 'Diamond' : (player.rating >= 1200 ? 'Silver' : 'Bronze'),
        lastUpdated: new Date()
      });
      console.log(`Added rating for player: ${player.name}`);
    }
    
    console.log('Sample player ratings added');
    
    // Create a sample game room
    await addDoc(collection(db, 'game_rooms'), {
      gameId: 'sample-game-123',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      players: [
        { userId: 'player1', color: 'white' },
        { userId: 'player2', color: 'black' }
      ],
      currentTurn: 'player1',
      moves: [],
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    });
    
    console.log('Sample game room added');
    
    // Create sample matchmaking entries
    await addDoc(collection(db, 'matchmaking_queue'), {
      userId: 'player3',
      rating: 900,
      preferences: { timeControl: '10+0' },
      timestamp: serverTimestamp(),
      status: 'searching'
    });
    
    console.log('Sample matchmaking entry added');
    
    // Create sample game invite
    await addDoc(collection(db, 'game_invites'), {
      inviterId: 'player1',
      inviteeId: 'player3',
      status: 'pending',
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 3600000), // Expires in 1 hour
      gameOptions: { timeControl: '5+3' }
    });
    
    console.log('Sample game invite added');
    
    // Add sample leaderboard entries
    const leaderboardPlayers = [
      ...players,
      { id: 'player4', name: 'Grandmaster', rating: 2300 },
      { id: 'player5', name: 'Master Player', rating: 2100 }
    ];
    
    for (const player of leaderboardPlayers) {
      if (player.rating >= 1600) { // Only players with rating 1600+ on leaderboard
        await setDoc(doc(db, 'leaderboard', player.id), {
          userId: player.id,
          gamingName: player.name,
          rating: player.rating,
          rank: player.rating >= 2200 ? 'Grandmaster' : 
                (player.rating >= 2000 ? 'Master' : 
                (player.rating >= 1800 ? 'Diamond' : 'Platinum')),
          updatedAt: new Date()
        });
      }
    }
    
    console.log('Sample leaderboard entries added');
    
    console.log('Firestore initialization complete!');
    return true;
  } catch (error) {
    console.error('Error initializing Firestore:', error);
    throw error;
  }
};

export default initializeFirestore; 