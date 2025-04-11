import { Chess } from 'chess.js';

export class ChessEngine {
  constructor(fen = 'start') {
    this.board = new Chess(fen === 'start' ? undefined : fen);
    this.MAX_DEPTH = 60;
    this.INFINITY = 1000000;
    this.startTime = 0;
    this.maxTime = 5; // seconds
    this.nodesSearched = 0;
    this.killerMoves = Array(64).fill().map(() => Array(2).fill(null));
    this.historyTable = new Map();
    this.transpositionTable = new Map();
    
    // Professional-grade piece values
    this.pieceValues = {
      p: 100,    // pawn
      b: 335,    // bishop  
      n: 325,    // knight
      r: 500,    // rook
      q: 975,    // queen
      k: 20000   // king
    };
    
    // Opening book moves (simplified)
    this.openingBook = {
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': [
        'e2e4', 'd2d4', 'c2c4', 'g1f3'  // Common opening moves
      ],
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -': [
        'c7c5', 'e7e5', 'e7e6', 'c7c6'  // Common responses to e4
      ],
      'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -': [
        'd7d5', 'g8f6', 'e7e6'  // Common responses to d4
      ]
    };
    
    // Endgame piece-square tables
    this.endgamePST = {
      'k': [  // King becomes more active in endgame
        -50,-40,-30,-20,-20,-30,-40,-50,
        -30,-20,-10,  0,  0,-10,-20,-30,
        -30,-10, 20, 30, 30, 20,-10,-30,
        -30,-10, 30, 40, 40, 30,-10,-30,
        -30,-10, 30, 40, 40, 30,-10,-30,
        -30,-10, 20, 30, 30, 20,-10,-30,
        -30,-30,  0,  0,  0,  0,-30,-30,
        -50,-30,-30,-30,-30,-30,-30,-50
      ],
      'p': [  // Pawns more valuable as they advance
        0,  0,  0,  0,  0,  0,  0,  0,
        80, 80, 80, 80, 80, 80, 80, 80,
        50, 50, 50, 50, 50, 50, 50, 50,
        30, 30, 30, 30, 30, 30, 30, 30,
        20, 20, 20, 20, 20, 20, 20, 20,
        10, 10, 10, 10, 10, 10, 10, 10,
        10, 10, 10, 10, 10, 10, 10, 10,
        0,  0,  0,  0,  0,  0,  0,  0
      ]
    };
    
    // Middlegame piece-square tables
    this.pst = {
      'p': [
        0,   0,   0,   0,   0,   0,   0,   0,
        50,  50,  50,  50,  50,  50,  50,  50,
        10,  10,  20,  30,  30,  20,  10,  10,
        5,   5,  10,  25,  25,  10,   5,   5,
        0,   0,   0,  20,  20,   0,   0,   0,
        5,  -5, -10,   0,   0, -10,  -5,   5,
        5,  10,  10, -20, -20,  10,  10,   5,
        0,   0,   0,   0,   0,   0,   0,   0
      ],
      'n': [
        -50, -40, -30, -30, -30, -30, -40, -50,
        -40, -20,   0,   0,   0,   0, -20, -40,
        -30,   0,  10,  15,  15,  10,   0, -30,
        -30,   5,  15,  20,  20,  15,   5, -30,
        -30,   0,  15,  20,  20,  15,   0, -30,
        -30,   5,  10,  15,  15,  10,   5, -30,
        -40, -20,   0,   5,   5,   0, -20, -40,
        -50, -40, -30, -30, -30, -30, -40, -50
      ],
      'b': [
        -20, -10, -10, -10, -10, -10, -10, -20,
        -10,   0,   0,   0,   0,   0,   0, -10,
        -10,   0,   5,  10,  10,   5,   0, -10,
        -10,   5,   5,  10,  10,   5,   5, -10,
        -10,   0,  10,  10,  10,  10,   0, -10,
        -10,  10,  10,  10,  10,  10,  10, -10,
        -10,   5,   0,   0,   0,   0,   5, -10,
        -20, -10, -10, -10, -10, -10, -10, -20
      ],
      'r': [
        0,   0,   0,   0,   0,   0,   0,   0,
        5,  10,  10,  10,  10,  10,  10,   5,
        -5,   0,   0,   0,   0,   0,   0,  -5,
        -5,   0,   0,   0,   0,   0,   0,  -5,
        -5,   0,   0,   0,   0,   0,   0,  -5,
        -5,   0,   0,   0,   0,   0,   0,  -5,
        -5,   0,   0,   0,   0,   0,   0,  -5,
        0,    0,   0,   5,   5,   0,   0,   0
      ],
      'q': [
        -20, -10, -10,  -5,  -5, -10, -10, -20,
        -10,   0,   0,   0,   0,   0,   0, -10,
        -10,   0,   5,   5,   5,   5,   0, -10,
        -5,    0,   5,   5,   5,   5,   0,  -5,
        0,     0,   5,   5,   5,   5,   0,  -5,
        -10,   5,   5,   5,   5,   5,   0, -10,
        -10,   0,   5,   0,   0,   0,   0, -10,
        -20, -10, -10,  -5,  -5, -10, -10, -20
      ],
      'k': [
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -20, -30, -30, -40, -40, -30, -30, -20,
        -10, -20, -20, -20, -20, -20, -20, -10,
        20,   20,   0,   0,   0,   0,  20,  20,
        20,   30,  10,   0,   0,  10,  30,  20
      ]
    };
  }

  // Utility function to convert algebraic notation to index
  algebraicToIndex(square) {
    const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = 8 - parseInt(square.charAt(1));
    return rank * 8 + file;
  }

  isEndgame() {
    // Determine if the position is in endgame
    const queens = this.board.pieces('q').length + this.board.pieces('Q').length;
    const totalPieces = this.board.pieces('p', 'n', 'b', 'r', 'q', 'k').length + 
                        this.board.pieces('P', 'N', 'B', 'R', 'Q', 'K').length;
    return queens === 0 || (queens === 2 && totalPieces <= 12);
  }

  evaluatePosition() {
    // Advanced position evaluation
    if (this.board.isCheckmate()) {
      return this.board.turn() === 'w' ? -this.INFINITY : this.INFINITY;
    }
    if (this.board.isDraw() || this.board.isStalemate() || this.board.isInsufficientMaterial()) {
      return 0;
    }

    let score = 0;
    const isEndgame = this.isEndgame();
    
    // Material and position evaluation
    for (let square of this.board.SQUARES) {
      const piece = this.board.get(square);
      if (piece) {
        // Basic material value
        const pieceType = piece.type;
        const color = piece.color;
        const value = this.pieceValues[pieceType];
        
        // Position bonus based on game phase
        const squareIdx = this.algebraicToIndex(square);
        const flippedIdx = color === 'w' ? squareIdx : 63 - squareIdx;
        
        let positionBonus;
        if (isEndgame && this.endgamePST[pieceType]) {
          positionBonus = this.endgamePST[pieceType][flippedIdx];
        } else if (this.pst[pieceType]) {
          positionBonus = this.pst[pieceType][flippedIdx];
        } else {
          positionBonus = 0;
        }
        
        const finalValue = value + positionBonus;
        score += color === 'w' ? finalValue : -finalValue;
      }
    }

    // Mobility evaluation (approximation)
    if (!isEndgame) {
      const currentTurn = this.board.turn();
      
      // Save the current turn
      const originalTurn = this.board.turn();
      
      // Evaluate mobility for white
      if (originalTurn !== 'w') this.board.load(this.board.fen().replace(' b ', ' w '));
      const whiteMobility = this.board.moves().length;
      
      // Evaluate mobility for black
      if (originalTurn !== 'b') this.board.load(this.board.fen().replace(' w ', ' b '));
      const blackMobility = this.board.moves().length;
      
      // Restore the original position
      if (originalTurn !== this.board.turn()) {
        this.board.load(this.board.fen().replace(` ${this.board.turn()} `, ` ${originalTurn} `));
      }
      
      score += (whiteMobility - blackMobility) * 5;
    }

    // Pawn structure evaluation
    score += this.evaluatePawnStructure();
    
    // King safety
    if (!isEndgame) {
      score += this.evaluateKingSafety();
    }
    
    // Bishop pair bonus
    const whiteBishops = this.board.pieces('B').length;
    const blackBishops = this.board.pieces('b').length;
    if (whiteBishops >= 2) score += 50;
    if (blackBishops >= 2) score -= 50;

    return this.board.turn() === 'w' ? score : -score;
  }

  evaluatePawnStructure() {
    let score = 0;
    
    // Create a map of pawns by file
    const whitePawns = Array(8).fill(0);
    const blackPawns = Array(8).fill(0);
    
    for (let square of this.board.SQUARES) {
      const piece = this.board.get(square);
      if (piece) {
        if (piece.type === 'p') {
          const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
          if (piece.color === 'w') {
            whitePawns[file]++;
          } else {
            blackPawns[file]++;
          }
        }
      }
    }
    
    // Evaluate doubled pawns
    for (let file = 0; file < 8; file++) {
      if (whitePawns[file] > 1) {
        score -= 20 * (whitePawns[file] - 1);
      }
      if (blackPawns[file] > 1) {
        score += 20 * (blackPawns[file] - 1);
      }
    }
    
    // Evaluate isolated pawns
    for (let file = 0; file < 8; file++) {
      const adjacentFiles = [];
      if (file > 0) adjacentFiles.push(file - 1);
      if (file < 7) adjacentFiles.push(file + 1);
      
      if (whitePawns[file] > 0) {
        const hasAdjacent = adjacentFiles.some(adjFile => whitePawns[adjFile] > 0);
        if (!hasAdjacent) {
          score -= 15;
        }
      }
      
      if (blackPawns[file] > 0) {
        const hasAdjacent = adjacentFiles.some(adjFile => blackPawns[adjFile] > 0);
        if (!hasAdjacent) {
          score += 15;
        }
      }
    }
    
    return score;
  }

  evaluateKingSafety() {
    let score = 0;
    
    for (const color of ['w', 'b']) {
      const kingSquare = this.board.squaresOf(color === 'w' ? 'K' : 'k')[0];
      if (!kingSquare) continue;
      
      // Pawn shield
      let pawnShield = 0;
      const kingIdx = this.algebraicToIndex(kingSquare);
      const kingFile = kingIdx % 8;
      const kingRank = Math.floor(kingIdx / 8);
      
      const forwardDirection = color === 'w' ? -1 : 1;
      const shieldRanks = [kingRank + forwardDirection, kingRank + 2 * forwardDirection];
      
      for (let file = Math.max(0, kingFile - 1); file <= Math.min(7, kingFile + 1); file++) {
        for (let rank of shieldRanks) {
          if (rank >= 0 && rank < 8) {
            const shieldSquare = String.fromCharCode('a'.charCodeAt(0) + file) + (8 - rank);
            const piece = this.board.get(shieldSquare);
            if (piece && piece.type === 'p' && piece.color === color) {
              pawnShield += 10;
            }
          }
        }
      }
      
      score += color === 'w' ? pawnShield : -pawnShield;
      
      // King tropism (penalize enemy pieces near king)
      const enemyColor = color === 'w' ? 'b' : 'w';
      for (const pieceType of ['q', 'r', 'b', 'n']) {
        const enemyPieces = this.board.squaresOf(enemyColor === 'w' ? pieceType.toUpperCase() : pieceType);
        for (const pieceSquare of enemyPieces) {
          const distance = this.getSquareDistance(kingSquare, pieceSquare);
          const penalty = 15 / Math.max(1, distance);
          score += color === 'w' ? -penalty : penalty;
        }
      }
    }
    
    return score;
  }

  getSquareDistance(sq1, sq2) {
    const file1 = sq1.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank1 = parseInt(sq1.charAt(1)) - 1;
    const file2 = sq2.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank2 = parseInt(sq2.charAt(1)) - 1;
    
    return Math.max(Math.abs(file1 - file2), Math.abs(rank1 - rank2));
  }

  getMoveScore(move, depth) {
    // Score moves for move ordering
    let score = 0;
    
    // Captures (ordered by MVV-LVA)
    const targetSquare = move.to;
    const capturedPiece = this.board.get(targetSquare);
    if (capturedPiece) {
      const victim = capturedPiece.type;
      const attacker = this.board.get(move.from).type;
      score = 10000 + (this.pieceValues[victim] - this.pieceValues[attacker] / 100);
    }
    
    // Killer moves
    else if (this.killerMoves[depth][0] === move.san) {
      score = 9000;
    } 
    else if (this.killerMoves[depth][1] === move.san) {
      score = 8000;
    }
    
    // History heuristic
    const historyKey = `${move.from}${move.to}`;
    if (this.historyTable.has(historyKey)) {
      score += this.historyTable.get(historyKey);
    }
    
    // Promotion bonus
    if (move.promotion) {
      score += 15000;
    }
    
    return score;
  }

  orderMoves(moves, depth) {
    // Order moves for better pruning
    const scoredMoves = moves.map(move => {
      return {
        move: move,
        score: this.getMoveScore(move, depth)
      };
    });
    
    return scoredMoves.sort((a, b) => b.score - a.score).map(m => m.move);
  }

  quiescenceSearch(alpha, beta, depth = 0) {
    // Quiescence search to handle tactical positions
    if (this.isTimeUp()) {
      throw new Error("Calculation time exceeded");
    }
    
    this.nodesSearched++;
    
    const standPat = this.evaluatePosition();
    
    if (standPat >= beta) {
      return beta;
    }
    
    if (alpha < standPat) {
      alpha = standPat;
    }
    
    if (depth < -4) {  // Limit quiescence depth
      return standPat;
    }

    const moves = this.board.moves({ verbose: true }).filter(move => move.captured);
    const orderedMoves = this.orderMoves(moves, depth);

    for (const move of orderedMoves) {
      this.board.move(move);
      const score = -this.quiescenceSearch(-beta, -alpha, depth - 1);
      this.board.undo();
      
      if (score >= beta) {
        return beta;
      }
      
      if (score > alpha) {
        alpha = score;
      }
    }

    return alpha;
  }

  negamax(depth, alpha, beta, nullMove = true) {
    // Enhanced negamax with null move pruning
    if (this.isTimeUp()) {
      throw new Error("Calculation time exceeded");
    }
    
    // Check opening book
    if (depth === this.MAX_DEPTH) {
      const bookMove = this.getBookMove();
      if (bookMove) {
        return { score: 0, move: bookMove };
      }
    }

    // Position hash for transposition table
    const positionHash = this.board.fen();
    
    // Transposition table lookup
    if (this.transpositionTable.has(positionHash)) {
      const entry = this.transpositionTable.get(positionHash);
      if (entry.depth >= depth) {
        return entry.data;
      }
    }
    
    this.nodesSearched++;
    
    if (depth <= 0) {
      const score = this.quiescenceSearch(alpha, beta);
      return { score, move: null };
    }

    // Null move pruning
    if (nullMove && depth >= 3 && !this.board.isCheck() && !this.isEndgame()) {
      // Simulate a "pass" by switching turns
      const fen = this.board.fen();
      const fenParts = fen.split(' ');
      fenParts[1] = fenParts[1] === 'w' ? 'b' : 'w';
      fenParts[3] = '-'; // No en passant
      this.board.load(fenParts.join(' '));
      
      const nullScore = -this.negamax(depth - 3, -beta, -beta + 1, false).score;
      this.board.load(fen); // Restore original position
      
      if (nullScore >= beta) {
        return { score: beta, move: null };
      }
    }

    let bestMove = null;
    let bestScore = -this.INFINITY;

    const moves = this.board.moves({ verbose: true });
    if (moves.length === 0) {
      if (this.board.isCheck()) {
        return { score: -this.INFINITY, move: null }; // Checkmate
      }
      return { score: 0, move: null }; // Stalemate
    }

    const orderedMoves = this.orderMoves(moves, depth);
    
    // Aspiration windows for deeper searches
    if (depth > 6) {
      alpha = Math.max(-this.INFINITY, alpha - 50);
      beta = Math.min(this.INFINITY, beta + 50);
    }

    for (const move of orderedMoves) {
      this.board.move(move);
      const result = this.negamax(depth - 1, -beta, -alpha, nullMove);
      const score = -result.score;
      this.board.undo();

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
        alpha = Math.max(alpha, score);
        
        // Update history heuristic
        if (!move.captured) {
          const historyKey = `${move.from}${move.to}`;
          const currentValue = this.historyTable.get(historyKey) || 0;
          this.historyTable.set(historyKey, currentValue + depth * depth);
        }
      }

      if (alpha >= beta) {
        // Update killer moves
        if (!move.captured) {
          if (this.killerMoves[depth][0] !== move.san) {
            this.killerMoves[depth][1] = this.killerMoves[depth][0];
            this.killerMoves[depth][0] = move.san;
          }
        }
        break;
      }
    }

    // Save to transposition table
    this.transpositionTable.set(positionHash, { 
      depth: depth,
      data: { score: bestScore, move: bestMove } 
    });

    return { score: bestScore, move: bestMove };
  }

  getBookMove() {
    // Get move from opening book
    const fen = this.board.fen().split(' ').slice(0, 2).join(' ');
    if (this.openingBook[fen]) {
      const legalBookMoves = this.openingBook[fen].filter(moveUci => {
        try {
          const from = moveUci.substring(0, 2);
          const to = moveUci.substring(2, 4);
          const promotion = moveUci.length > 4 ? moveUci[4] : undefined;
          
          const moveObj = {
            from: from,
            to: to,
            promotion: promotion
          };
          
          const move = this.board.move(moveObj);
          this.board.undo();
          return !!move;
        } catch (e) {
          return false;
        }
      });
      
      if (legalBookMoves.length > 0) {
        const randomIndex = Math.floor(Math.random() * legalBookMoves.length);
        const moveUci = legalBookMoves[randomIndex];
        const from = moveUci.substring(0, 2);
        const to = moveUci.substring(2, 4);
        const promotion = moveUci.length > 4 ? moveUci[4] : undefined;
        
        return { from, to, promotion };
      }
    }
    return null;
  }

  iterativeDeepening(maxDepth = 4, maxTime = 3.0) {
    // Time-managed iterative deepening with aspiration windows
    this.startTime = Date.now();
    this.maxTime = maxTime * 1000; // Convert to milliseconds
    this.nodesSearched = 0;
    let bestMove = null;
    
    try {
      // Check opening book first
      const bookMove = this.getBookMove();
      if (bookMove) {
        return bookMove;
      }

      // Always calculate at least depth 1
      const initial = this.negamax(1, -this.INFINITY, this.INFINITY);
      if (initial.move) {
        bestMove = initial.move;
      }

      // Continue with deeper searches if time allows
      for (let depth = 2; depth <= maxDepth; depth++) {
        if (this.isTimeUp()) {
          break;
        }
        
        const result = this.negamax(depth, -this.INFINITY, this.INFINITY);
        
        if (result.move) {
          bestMove = result.move;
          console.log(`Depth ${depth} completed. Best move: ${bestMove.from}${bestMove.to}. Score: ${result.score}. Nodes: ${this.nodesSearched}`);
        }
        
        // Early exit if we found a winning position
        if (Math.abs(result.score) > 5000) {
          break;
        }
      }
    } catch (e) {
      if (e.message !== "Calculation time exceeded") {
        console.error("Search error:", e);
      }
    }
    
    // Fallback to first legal move if no move found
    if (!bestMove) {
      const moves = this.board.moves({ verbose: true });
      if (moves.length > 0) {
        bestMove = moves[0];
      }
    }

    return bestMove;
  }

  isTimeUp() {
    // Check if calculation time is exceeded
    return Date.now() - this.startTime > this.maxTime;
  }

  // Main interface method to get the best move
  getBestMove(fen = null, maxDepth = 4, maxTime = 3.0) {
    if (fen) {
      this.board.load(fen);
    }
    
    const bestMove = this.iterativeDeepening(maxDepth, maxTime);
    return bestMove;
  }
}

// Singleton instance for app-wide use
const chessEngine = new ChessEngine();
export default chessEngine; 