import { create } from 'zustand';
import { socketService } from '../services/socket';

const useGameStore = create((set, get) => ({
  gameId: null,
  players: [],
  currentTurn: null,
  isGameStarted: false,
  gameStatus: 'waiting', // waiting, playing, finished
  moves: [],
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',

  initializeGame: (userId) => {
    set({ 
      gameStatus: 'waiting', 
      players: [userId],
      isGameStarted: false,
      gameId: null
    });
    socketService.createGame(userId);
  },

  joinGame: (gameId, userId) => {
    set({ 
      gameId, 
      gameStatus: 'waiting',
      isGameStarted: false
    });
    socketService.joinGame(gameId, userId);
  },

  makeMove: (gameId, userId, move) => {
    socketService.makeMove(gameId, userId, move);
  },

  leaveGame: (gameId, userId) => {
    socketService.leaveGame(gameId, userId);
    set({ 
      gameId: null, 
      players: [], 
      currentTurn: null, 
      isGameStarted: false,
      gameStatus: 'waiting'
    });
  },

  setGameId: (gameId) => set({ gameId }),
  
  setPlayers: (players) => {
    set({ 
      players,
      gameStatus: players.length >= 2 ? 'playing' : 'waiting',
      isGameStarted: players.length >= 2
    });
  },
  
  setCurrentTurn: (currentTurn) => set({ currentTurn }),
  setGameStatus: (gameStatus) => set({ gameStatus }),
  setFen: (fen) => set({ fen }),
  addMove: (move) => set(state => ({ moves: [...state.moves, move] })),

  resetGame: () => {
    set({
      gameId: null,
      players: [],
      currentTurn: null,
      isGameStarted: false,
      gameStatus: 'waiting',
      moves: [],
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    });
  }
}));

export default useGameStore;