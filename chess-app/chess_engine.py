import chess
import time
from typing import Tuple, List, Optional, Dict
import random
import chess.engine
import os

class Engine:
    def __init__(self, fen=None):
        self.board = chess.Board(fen) if fen else chess.Board()
        self.MAX_DEPTH = 60
        self.INFINITY = 1000000
        self.start_time = 0
        self.max_time = 5
        self.nodes_searched = 0
        self.killer_moves = [[None] * 64 for _ in range(2)]
        self.history_table = {}
        self.engine = None
        
        # Enhanced piece values with mobility bonuses
        self.piece_values = {
            1: 100,    # pawn
            2: 335,    # bishop
            3: 325,    # knight
            4: 500,    # rook
            5: 975,    # queen
            6: 20000   # king
        }
        
        # Mobility bonuses for each piece type
        self.mobility_bonus = {
            1: 0,      # pawns don't get mobility bonus
            2: 5,      # bishops
            3: 3,      # knights
            4: 2,      # rooks
            5: 1,      # queens
            6: 0       # king
        }
        
        # Center control bonuses
        self.center_squares = [chess.E4, chess.E5, chess.D4, chess.D5]
        self.center_bonus = 10
        
        # Pawn structure bonuses
        self.passed_pawn_bonus = 50
        self.doubled_pawn_penalty = -20
        self.isolated_pawn_penalty = -15
        self.backward_pawn_penalty = -10
        
        # King safety bonuses
        self.king_safety_bonus = 30
        self.king_attack_bonus = 40
        
        # Opening book moves (simplified)
        self.opening_book = {
            'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': [
                'e2e4', 'd2d4', 'c2c4', 'g1f3'  # Common opening moves
            ],
            # Sicilian Defense responses
            'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -': [
                'c7c5'  # Sicilian Defense
            ],
            'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [
                'g1f3', 'c2c3', 'b1c3', 'd2d4'  # Responses to Sicilian
            ],
            
            # French Defense
            'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -': [
                'e7e6'  # French Defense
            ],
            'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [
                'd2d4', 'b1c3', 'g1f3'  # Responses to French
            ],
            
            # Caro-Kann Defense
            'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -': [
                'c7c6'  # Caro-Kann Defense
            ],
            'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [
                'd2d4', 'b1c3', 'g1f3'  # Responses to Caro-Kann
            ],
            
            # Queen's Gambit
            'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -': [
                'd7d5', 'g8f6', 'e7e6'  # Responses to d4
            ],
            'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': [
                'c2c4', 'g1f3', 'b1c3'  # Queen's Gambit lines
            ],
            
            # Indian Defenses
            'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -': [
                'g8f6'  # King's Indian, Nimzo-Indian, etc.
            ],
            'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': [
                'c2c4', 'g1f3', 'c1g5'  # Responses to Nf6
            ],
            
            # Ruy Lopez
            'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -': [
                'e7e5'  # Open game
            ],
            'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [
                'g1f3'  # Knight development
            ],
            'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': [
                'b8c6'  # Knight development
            ],
            'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': [
                'f1b5'  # Ruy Lopez
            ],
            
            # Italian Game
            'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': [
                'f1c4'  # Italian Game
            ],
            
            # Petrov Defense
            'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': [
                'g8f6'  # Petrov
            ],
            'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': [
                'f3e5', 'd2d4'  # Petrov main lines
            ]
        }
        
        # Endgame piece-square tables
        self.endgame_pst = {
            'K': [  # King becomes more active in endgame
                -50,-40,-30,-20,-20,-30,-40,-50,
                -30,-20,-10,  0,  0,-10,-20,-30,
                -30,-10, 20, 30, 30, 20,-10,-30,
                -30,-10, 30, 40, 40, 30,-10,-30,
                -30,-10, 30, 40, 40, 30,-10,-30,
                -30,-10, 20, 30, 30, 20,-10,-30,
                -30,-30,  0,  0,  0,  0,-30,-30,
                -50,-30,-30,-30,-30,-30,-30,-50
            ],
            'P': [  # Pawns more valuable as they advance
                0,  0,  0,  0,  0,  0,  0,  0,
                80, 80, 80, 80, 80, 80, 80, 80,
                50, 50, 50, 50, 50, 50, 50, 50,
                30, 30, 30, 30, 30, 30, 30, 30,
                20, 20, 20, 20, 20, 20, 20, 20,
                10, 10, 10, 10, 10, 10, 10, 10,
                10, 10, 10, 10, 10, 10, 10, 10,
                0,  0,  0,  0,  0,  0,  0,  0
            ]
        }
        
        # Piece-square tables for positional evaluation
        self.pst = {
            'P': [
                0,   0,   0,   0,   0,   0,   0,   0,
                50,  50,  50,  50,  50,  50,  50,  50,
                10,  10,  20,  30,  30,  20,  10,  10,
                5,   5,  10,  25,  25,  10,   5,   5,
                0,   0,   0,  20,  20,   0,   0,   0,
                5,  -5, -10,   0,   0, -10,  -5,   5,
                5,  10,  10, -20, -20,  10,  10,   5,
                0,   0,   0,   0,   0,   0,   0,   0
            ],
            'N': [
                -50, -40, -30, -30, -30, -30, -40, -50,
                -40, -20,   0,   0,   0,   0, -20, -40,
                -30,   0,  10,  15,  15,  10,   0, -30,
                -30,   5,  15,  20,  20,  15,   5, -30,
                -30,   0,  15,  20,  20,  15,   0, -30,
                -30,   5,  10,  15,  15,  10,   5, -30,
                -40, -20,   0,   5,   5,   0, -20, -40,
                -50, -40, -30, -30, -30, -30, -40, -50
            ],
            'B': [
                -20, -10, -10, -10, -10, -10, -10, -20,
                -10,   0,   0,   0,   0,   0,   0, -10,
                -10,   0,   5,  10,  10,   5,   0, -10,
                -10,   5,   5,  10,  10,   5,   5, -10,
                -10,   0,  10,  10,  10,  10,   0, -10,
                -10,  10,  10,  10,  10,  10,  10, -10,
                -10,   5,   0,   0,   0,   0,   5, -10,
                -20, -10, -10, -10, -10, -10, -10, -20
            ],
            'R': [
                0,   0,   0,   0,   0,   0,   0,   0,
                5,  10,  10,  10,  10,  10,  10,   5,
                -5,   0,   0,   0,   0,   0,   0,  -5,
                -5,   0,   0,   0,   0,   0,   0,  -5,
                -5,   0,   0,   0,   0,   0,   0,  -5,
                -5,   0,   0,   0,   0,   0,   0,  -5,
                -5,   0,   0,   0,   0,   0,   0,  -5,
                0,   0,   0,   5,   5,   0,   0,   0
            ],
            'Q': [
                -20, -10, -10,  -5,  -5, -10, -10, -20,
                -10,   0,   0,   0,   0,   0,   0, -10,
                -10,   0,   5,   5,   5,   5,   0, -10,
                -5,    0,   5,   5,   5,   5,   0,  -5,
                0,     0,   5,   5,   5,   5,   0,  -5,
                -10,   5,   5,   5,   5,   5,   0, -10,
                -10,   0,   5,   0,   0,   0,   0, -10,
                -20, -10, -10,  -5,  -5, -10, -10, -20
            ],
            'K': [
                -30, -40, -40, -50, -50, -40, -40, -30,
                -30, -40, -40, -50, -50, -40, -40, -30,
                -30, -40, -40, -50, -50, -40, -40, -30,
                -30, -40, -40, -50, -50, -40, -40, -30,
                -20, -30, -30, -40, -40, -30, -30, -20,
                -10, -20, -20, -20, -20, -20, -20, -10,
                20,   20,   0,   0,   0,   0,  20,  20,
                20,   30,  10,   0,   0,  10,  30,  20
            ]
        }

        self.initialize_engine()

    def initialize_engine(self):
        """Try to initialize the Stockfish engine with proper configuration"""
        try:
            # Look for Stockfish in various locations
            stockfish_paths = [
                "engines/stockfish/stockfish-windows-x86-64-avx2.exe",
                os.path.join(os.path.dirname(__file__), "engines", "stockfish.exe"),
                os.path.join(os.path.dirname(__file__), "engines", "stockfish-windows-x86-64-avx2.exe"),
                os.path.join(os.path.dirname(__file__), "engines", "stockfish-ubuntu-x86-64-avx2"),
                os.path.join(os.path.dirname(__file__), "engines", "stockfish-macos-x86-64-modern"),
                os.path.join(os.path.dirname(__file__), "engines", "stockfish-macos-x86-64-apple-silicon"),
                "stockfish",
                "stockfish.exe",
                "C:/Program Files/Stockfish/stockfish.exe",
                "C:/Program Files (x86)/Stockfish/stockfish.exe",
                "/usr/local/bin/stockfish",
                "/usr/bin/stockfish",
            ]
            
            for path in stockfish_paths:
                try:
                    self.engine = chess.engine.SimpleEngine.popen_uci(path)
                    print(f"Successfully initialized Stockfish at: {path}")
                    return
                except Exception as e:
                    continue
                    
            # If we get here, we couldn't find Stockfish
            print("Warning: Could not find Stockfish chess engine. Using fallback engine.")
            self.engine = None
        except Exception as e:
            print(f"Error initializing engine: {e}")
            self.engine = None

    def get_best_move(self, fen, depth=3):
        """Get the best move at the given depth. Higher depth = stronger play."""
        try:
            board = chess.Board(fen)
            
            # If we have Stockfish available, use it
            if self.engine:
                # Configure engine strength based on depth
                if depth >= 5:  # Grandmaster level (virtually unbeatable)
                    self.engine.configure({
                        "Threads": 4,
                        "Hash": 512,
                        "MultiPV": 1,
                        "UCI_LimitStrength": False,
                        "Skill Level": 20,
                        "Move Overhead": 100
                    })
                    time_limit = 5.0  # Give it more time to find best moves
                    search_depth = 18
                elif depth >= 4:  # Strong master level (can beat most humans)
                    self.engine.configure({
                        "Threads": 4,
                        "Hash": 256,
                        "MultiPV": 1,
                        "UCI_LimitStrength": False,
                        "Skill Level": 20,
                        "Move Overhead": 80
                    })
                    time_limit = 3.0
                    search_depth = 15
                elif depth >= 3:  # Advanced player (can defeat a grandmaster)
                    self.engine.configure({
                        "Threads": 4,          # Use more threads for faster calculation
                        "Hash": 512,           # Increase hash size for better caching
                        "UCI_LimitStrength": False,  # Don't limit engine strength
                        "Skill Level": 20,     # Maximum skill level
                        "Move Overhead": 10    # Reduced for faster calculation
                    })
                    time_limit = 3.0           # Longer time limit for better moves
                    search_depth = 18          # Same depth as depth 5+ for maximum strength
                elif depth >= 2:  # Intermediate level
                    self.engine.configure({
                        "Threads": 1,
                        "Hash": 64,
                        "MultiPV": 1,
                        "UCI_LimitStrength": True,
                        "UCI_Elo": 1800,
                        "Skill Level": 10
                    })
                    time_limit = 1.0
                    search_depth = 8
                else:  # Beginner level
                    self.engine.configure({
                        "Threads": 1,
                        "Hash": 16,
                        "MultiPV": 1,
                        "UCI_LimitStrength": True,
                        "UCI_Elo": 1200,
                        "Skill Level": 5
                    })
                    time_limit = 0.5
                    search_depth = 5
                
                # Perform the search
                result = self.engine.play(
                    board,
                    chess.engine.Limit(time=time_limit, depth=search_depth),
                    info=chess.engine.INFO_ALL
                )
                
                if result.move:
                    return result.move.uci()
            
            # Fallback to internal engine if Stockfish not available
            self.board = chess.Board(fen)
            
            # Make depth 3+ stronger to challenge grandmasters even in the fallback engine
            if depth >= 3:  
                max_depth = 10  # Deeper search for depth 3+
                max_time = 5.0  # Much longer calculation time (5 seconds)
            else:
                max_depth = min(depth * 2, 6)  # Scale internal engine depth
                max_time = 0.5 * depth  # Scale calculation time with depth
            
            self.start_time = time.time()
            self.max_time = max_time
            
            if depth >= 3:  # Make depth 3+ strong enough to challenge grandmasters
                # First try opening book
                book_move = self.get_book_move()
                if book_move:
                    return book_move.uci()
                    
                # For complex positions, use enhanced search
                best_move = self.iterative_deepening(max_depth, max_time)
                if best_move and best_move != "None":
                    return best_move
            
            # For lower depths or if enhanced search fails, use simpler approach
            moves = list(self.board.legal_moves)
            if moves:
                # For depth 1, make some mistakes
                if depth == 1 and random.random() < 0.3:
                    return random.choice(moves).uci()
                    
                # Otherwise try to find a decent move
                best_score = -self.INFINITY
                best_move = moves[0]
                
                for move in moves:
                    self.board.push(move)
                    score = -self.evaluate_position()
                    self.board.pop()
                    
                    if score > best_score:
                        best_score = score
                        best_move = move
                
                return best_move.uci()
            
        except Exception as e:
            print(f"Error in get_best_move: {e}")
            
        # Last resort: return a random legal move
        return self.get_random_move(fen)

    def get_random_move(self, fen):
        """Get a random legal move as a fallback"""
        try:
            board = chess.Board(fen)
            legal_moves = list(board.legal_moves)
            if legal_moves:
                # Choose from better moves with some probability
                if random.random() < 0.7:  # 70% chance to make a reasonable move
                    # Filter captures and checks as "better" moves
                    better_moves = []
                    for move in legal_moves:
                        # Look for captures
                        is_capture = board.is_capture(move)
                        
                        # Look for checks
                        board.push(move)
                        gives_check = board.is_check()
                        board.pop()
                        
                        if is_capture or gives_check:
                            better_moves.append(move)
                    
                    # If we found better moves, choose from them
                    if better_moves:
                        return random.choice(better_moves).uci()
                    
                # Choose a completely random move
                return random.choice(legal_moves).uci()
        except Exception as e:
            print(f"Error getting random move: {e}")
        return None

    def is_valid_move(self, from_square: str, to_square: str) -> bool:
        """Check if a move is valid without making it on the board"""
        try:
            move = chess.Move.from_uci(f"{from_square}{to_square}")
            return move in self.board.legal_moves
        except:
            return False

    def make_move(self, from_square: str, to_square: str) -> bool:
        """Make a move on the board"""
        try:
            move = chess.Move.from_uci(f"{from_square}{to_square}")
            if move in self.board.legal_moves:
                self.board.push(move)
                return True
            return False
        except:
            return False

    def is_endgame(self) -> bool:
        """Determine if the position is in endgame"""
        queens = len(self.board.pieces(chess.QUEEN, chess.WHITE)) + len(self.board.pieces(chess.QUEEN, chess.BLACK))
        total_pieces = len(list(self.board.pieces(chess.QUEEN, chess.WHITE))) + len(list(self.board.pieces(chess.QUEEN, chess.BLACK)))
        return queens == 0 or (queens == 2 and total_pieces <= 6)

    def evaluate_position(self) -> int:
        """Advanced position evaluation with grandmaster-level factors"""
        if self.board.is_checkmate():
            return -self.INFINITY if self.board.turn else self.INFINITY
            
        if self.board.is_stalemate() or self.board.is_insufficient_material():
            return 0
            
        score = 0
        
        # Material evaluation
        for square in chess.SQUARES:
            piece = self.board.piece_at(square)
            if piece is not None:
                piece_type = piece.piece_type
                color = piece.color
                value = self.piece_values[piece_type]
                
                # Position bonus
                symbol = 'PNBRQK'[piece_type-1]
                square_idx = square if color else 63 - square
                
                # Use endgame tables in endgame situations
                if self.is_endgame() and symbol in self.endgame_pst:
                    position_bonus = self.endgame_pst[symbol][square_idx]
                else:
                    position_bonus = self.pst[symbol][square_idx]
                
                # Center control bonus
                if square in self.center_squares:
                    position_bonus += self.center_bonus
                
                # Piece-specific bonuses
                if piece_type == chess.KNIGHT:
                    # Knights are better with pawns around (closed positions)
                    pawn_count = len(list(self.board.pieces(chess.PAWN, chess.WHITE))) + len(list(self.board.pieces(chess.PAWN, chess.BLACK)))
                    if pawn_count > 10:
                        position_bonus += 15
                elif piece_type == chess.BISHOP:
                    # Bishops are better in open positions
                    pawn_count = len(list(self.board.pieces(chess.PAWN, chess.WHITE))) + len(list(self.board.pieces(chess.PAWN, chess.BLACK)))
                    if pawn_count < 10:
                        position_bonus += 15
                    
                    # Bishop pair bonus (already accounted for elsewhere)
                    # Control of long diagonals
                    if square in [chess.A1, chess.B2, chess.C3, chess.D4, chess.E5, chess.F6, chess.G7, chess.H8,
                                chess.H1, chess.G2, chess.F3, chess.E4, chess.D5, chess.C6, chess.B7, chess.A8]:
                        position_bonus += 10
                elif piece_type == chess.ROOK:
                    # Rooks on open files
                    file = chess.square_file(square)
                    if not any(self.board.piece_at(s) and self.board.piece_at(s).piece_type == chess.PAWN 
                            for s in chess.scan_forward(chess.BB_FILES[file])):
                        position_bonus += 25
                        
                    # Rooks on 7th rank (attacking pawns from behind)
                    if (color == chess.WHITE and chess.square_rank(square) == 6) or \
                       (color == chess.BLACK and chess.square_rank(square) == 1):
                        position_bonus += 20
                elif piece_type == chess.QUEEN:
                    # Queens should usually not be developed too early
                    if self.board.fullmove_number < 10:
                        # Penalty for early queen development
                        if (color == chess.WHITE and square not in [chess.D1, chess.E1]) or \
                           (color == chess.BLACK and square not in [chess.D8, chess.E8]):
                            position_bonus -= 15
                            
                final_value = value + position_bonus
                score += final_value if color else -final_value
        
        # Mobility evaluation - very important factor for grandmasters
        original_turn = self.board.turn
        for color in [chess.WHITE, chess.BLACK]:
            # Set turn temporarily to calculate mobility for this side
            self.board.turn = color
            mobility = len(list(self.board.legal_moves))
            
            # Weight mobility more significantly
            mobility_score = mobility * 5  # Increased weight for mobility
            score += mobility_score if color == chess.WHITE else -mobility_score
            
            for move in self.board.legal_moves:
                piece = self.board.piece_at(move.from_square)
                if piece:
                    # Add piece-specific mobility bonuses
                    if piece.piece_type != chess.PAWN:  # Pawns don't get mobility bonus
                        piece_mobility = self.mobility_bonus[piece.piece_type] * 2
                        score += piece_mobility if color == chess.WHITE else -piece_mobility
        
        # Restore original turn
        self.board.turn = original_turn
        
        # Development in opening - critical for grandmaster-level play
        if self.board.fullmove_number < 15:
            # Knights and bishops developed
            w_knights_developed = sum(1 for s in self.board.pieces(chess.KNIGHT, chess.WHITE) 
                                  if s not in [chess.B1, chess.G1])
            b_knights_developed = sum(1 for s in self.board.pieces(chess.KNIGHT, chess.BLACK) 
                                  if s not in [chess.B8, chess.G8])
            w_bishops_developed = sum(1 for s in self.board.pieces(chess.BISHOP, chess.WHITE) 
                                  if s not in [chess.C1, chess.F1])
            b_bishops_developed = sum(1 for s in self.board.pieces(chess.BISHOP, chess.BLACK) 
                                  if s not in [chess.C8, chess.F8])
            
            score += (w_knights_developed + w_bishops_developed) * 20
            score -= (b_knights_developed + b_bishops_developed) * 20
            
            # Castling completed or possible
            if self.board.has_castling_rights(chess.WHITE):
                score += 15
            elif self.board.has_kingside_castling_rights(chess.WHITE) or self.board.has_queenside_castling_rights(chess.WHITE):
                score += 10
                
            if self.board.has_castling_rights(chess.BLACK):
                score -= 15
            elif self.board.has_kingside_castling_rights(chess.BLACK) or self.board.has_queenside_castling_rights(chess.BLACK):
                score -= 10
        
        # Pawn structure evaluation with more detailed analysis
        score += self.evaluate_pawn_structure()
        
        # King safety evaluation - major factor in grandmaster games
        score += self.evaluate_king_safety()
        
        # Bishop pair bonus
        if len(self.board.pieces(chess.BISHOP, chess.WHITE)) >= 2:
            score += 50
        if len(self.board.pieces(chess.BISHOP, chess.BLACK)) >= 2:
            score -= 50
            
        # Control of critical squares in the center and attacking opportunities
        for square in [chess.D4, chess.E4, chess.D5, chess.E5]:
            # Check which side controls this square
            white_control = self.square_control(square, chess.WHITE)
            black_control = self.square_control(square, chess.BLACK)
            score += (white_control - black_control) * 5
            
        return score if self.board.turn else -score
        
    def square_control(self, square, color):
        """Calculate how many pieces attack a given square"""
        control = 0
        for s in chess.SQUARES:
            piece = self.board.piece_at(s)
            if piece and piece.color == color:
                # Skip kings to avoid infinite recursion with king safety evaluation
                if piece.piece_type == chess.KING:
                    continue
                    
                # Check if this piece attacks the square
                if self.board.is_attacked_by(color, square):
                    control += 1
        return control

    def evaluate_pawn_structure(self) -> int:
        """Evaluate pawn structure with advanced features"""
        score = 0
        
        for color in [chess.WHITE, chess.BLACK]:
            # Evaluate doubled pawns
            for file in range(8):
                pawns = [square for square in self.board.pieces(chess.PAWN, color)
                        if chess.square_file(square) == file]
                if len(pawns) > 1:
                    score += self.doubled_pawn_penalty * (1 if color else -1)
            
            # Evaluate isolated pawns
            for file in range(8):
                has_pawn = any(chess.square_file(square) == file
                             for square in self.board.pieces(chess.PAWN, color))
                has_adjacent = any(any(chess.square_file(square) == adj_file
                                     for square in self.board.pieces(chess.PAWN, color))
                                 for adj_file in [file-1, file+1] if 0 <= adj_file < 8)
                
                if has_pawn and not has_adjacent:
                    score += self.isolated_pawn_penalty * (1 if color else -1)
            
            # Evaluate passed pawns
            for square in self.board.pieces(chess.PAWN, color):
                if self.is_passed_pawn(square, color):
                    score += self.passed_pawn_bonus * (1 if color else -1)
            
            # Evaluate backward pawns
            for square in self.board.pieces(chess.PAWN, color):
                if self.is_backward_pawn(square, color):
                    score += self.backward_pawn_penalty * (1 if color else -1)
        
        return score

    def is_passed_pawn(self, square: int, color: bool) -> bool:
        """Check if a pawn is passed"""
        file = chess.square_file(square)
        rank = chess.square_rank(square)
        
        # Check if there are enemy pawns in adjacent files
        for adj_file in [file-1, file, file+1]:
            if 0 <= adj_file < 8:
                for adj_rank in range(rank + (1 if color else -1), 8 if color else -1, 1 if color else -1):
                    adj_square = chess.square(adj_file, adj_rank)
                    if self.board.piece_at(adj_square) == chess.Piece(chess.PAWN, not color):
                        return False
        
        return True

    def is_backward_pawn(self, square: int, color: bool) -> bool:
        """Check if a pawn is backward"""
        file = chess.square_file(square)
        rank = chess.square_rank(square)
        
        # Check if there are friendly pawns in adjacent files that are more advanced
        for adj_file in [file-1, file+1]:
            if 0 <= adj_file < 8:
                for adj_rank in range(rank + (1 if color else -1), 8 if color else -1, 1 if color else -1):
                    adj_square = chess.square(adj_file, adj_rank)
                    if self.board.piece_at(adj_square) == chess.Piece(chess.PAWN, color):
                        return True
        
        return False

    def evaluate_king_safety(self) -> int:
        """Evaluate king safety with advanced features"""
        score = 0
        
        for color in [chess.WHITE, chess.BLACK]:
            king_square = self.board.king(color)
            if king_square is None:
                continue
            
            # Pawn shield evaluation
            pawn_shield = 0
            king_file = chess.square_file(king_square)
            king_rank = chess.square_rank(king_square)
            
            shield_ranks = range(king_rank + (1 if color else -1),
                               king_rank + (3 if color else -3),
                               1 if color else -1)
            
            for file in range(max(0, king_file - 1), min(8, king_file + 2)):
                for rank in shield_ranks:
                    if 0 <= rank < 8:
                        square = chess.square(file, rank)
                        if self.board.piece_at(square) == chess.Piece(chess.PAWN, color):
                            pawn_shield += 10
            
            score += pawn_shield if color else -pawn_shield
            
            # King tropism (penalize enemy pieces near king)
            enemy_color = not color
            for piece_type in [chess.QUEEN, chess.ROOK, chess.BISHOP, chess.KNIGHT]:
                for piece_square in self.board.pieces(piece_type, enemy_color):
                    distance = chess.square_distance(king_square, piece_square)
                    score += (-15 // distance) if color else (15 // distance)
            
            # King mobility evaluation
            king_moves = len(list(self.board.legal_moves))
            score += (king_moves // 2) if color else -(king_moves // 2)
        
        return score

    def get_move_score(self, move: chess.Move, depth: int) -> int:
        """Score moves for move ordering"""
        score = 0
        
        # Captures (ordered by MVV-LVA)
        if self.board.is_capture(move):
            victim_type = self.board.piece_at(move.to_square).piece_type
            attacker_type = self.board.piece_at(move.from_square).piece_type
            score = 10000 + (victim_type * 100) - attacker_type
            
        # Killer moves
        elif self.killer_moves[0][depth] == move:
            score = 9000
        elif self.killer_moves[1][depth] == move:
            score = 8000
            
        # History heuristic
        score += self.history_table.get((move.from_square, move.to_square), 0)
        
        return score

    def order_moves(self, moves: List[chess.Move], depth: int) -> List[chess.Move]:
        """Order moves for better pruning"""
        move_scores = [(move, self.get_move_score(move, depth)) for move in moves]
        return [move for move, score in sorted(move_scores, key=lambda x: x[1], reverse=True)]

    def quiescence_search(self, alpha: int, beta: int, depth: int = 0) -> int:
        """Quiescence search to handle tactical positions"""
        if self.is_time_up():
            raise TimeoutError("Calculation time exceeded")
            
        stand_pat = self.evaluate_position()
        
        if stand_pat >= beta:
            return beta
        if alpha < stand_pat:
            alpha = stand_pat
        if depth < -4:  # Limit quiescence depth
            return stand_pat

        moves = list(self.board.legal_moves)
        moves = [move for move in moves if self.board.is_capture(move)]
        moves = self.order_moves(moves, depth)

        for move in moves:
            self.board.push(move)
            score = -self.quiescence_search(-beta, -alpha, depth - 1)
            self.board.pop()
            
            if score >= beta:
                return beta
            if score > alpha:
                alpha = score

        return alpha

    def negamax(self, depth: int, alpha: int, beta: int, null_move: bool = True) -> Tuple[int, Optional[chess.Move]]:
        """Enhanced negamax with null move pruning"""
        if self.is_time_up():
            raise TimeoutError("Calculation time exceeded")

        # Check opening book
        if depth == self.MAX_DEPTH:
            book_move = self.get_book_move()
            if book_move:
                return 0, book_move
        
        if depth <= 0:
            return self.quiescence_search(alpha, beta), None

        # Null move pruning
        if null_move and depth >= 3 and not self.board.is_check() and not self.is_endgame():
            self.board.push(chess.Move.null())
            null_score = -self.negamax(depth - 3, -beta, -beta + 1, False)[0]
            self.board.pop()
            
            if null_score >= beta:
                return beta, None

        best_move = None
        best_score = -self.INFINITY

        moves = list(self.board.legal_moves)
        if not moves:
            if self.board.is_check():
                return -self.INFINITY, None
            return 0, None

        moves = self.order_moves(moves, depth)
        
        # Aspiration windows for deeper searches
        if depth > 6:
            alpha = max(-self.INFINITY, alpha - 50)
            beta = min(self.INFINITY, beta + 50)

        for move in moves:
            self.board.push(move)
            score = -self.negamax(depth - 1, -beta, -alpha, null_move)[0]
            self.board.pop()

            if score > best_score:
                best_score = score
                best_move = move
                alpha = max(alpha, score)
                
                # Update history heuristic
                if not self.board.is_capture(move):
                    self.history_table[(move.from_square, move.to_square)] = \
                        self.history_table.get((move.from_square, move.to_square), 0) + depth * depth

            if alpha >= beta:
                # Update killer moves
                if not self.board.is_capture(move):
                    if self.killer_moves[0][depth] != move:
                        self.killer_moves[1][depth] = self.killer_moves[0][depth]
                        self.killer_moves[0][depth] = move
                break

        return best_score, best_move

    def get_book_move(self) -> Optional[chess.Move]:
        """Get move from opening book"""
        fen = self.board.fen().split(' ')[0] + ' ' + self.board.fen().split(' ')[1]
        if fen in self.opening_book:
            legal_book_moves = [move for move in self.opening_book[fen] 
                              if chess.Move.from_uci(move) in self.board.legal_moves]
            if legal_book_moves:
                return chess.Move.from_uci(random.choice(legal_book_moves))
        return None

    def iterative_deepening(self, max_depth: int, max_time: float = 5.0) -> str:
        """Time-managed iterative deepening with aspiration windows"""
        self.start_time = time.time()
        self.max_time = max_time
        self.nodes_searched = 0
        best_move = None
        
        try:
            # Check opening book first
            book_move = self.get_book_move()
            if book_move:
                return str(book_move)

            # Always calculate at least depth 1
            score, move = self.negamax(1, -self.INFINITY, self.INFINITY)
            if move:
                best_move = move

            # Continue with deeper searches if time allows
            for depth in range(2, max_depth + 1):
                if self.is_time_up():
                    break
                    
                score, move = self.negamax(depth, -self.INFINITY, self.INFINITY)
                if move:
                    best_move = move
                    
                # Early exit if we found a winning position
                if abs(score) > 5000:
                    break
                    
        except TimeoutError:
            pass
        except Exception as e:
            print(f"Search error: {e}")
            
        # Fallback to first legal move if no move found
        if best_move is None and list(self.board.legal_moves):
            best_move = list(self.board.legal_moves)[0]

        return str(best_move) if best_move else str(list(self.board.legal_moves)[0])

    def is_time_up(self) -> bool:
        """Check if calculation time is exceeded"""
        return time.time() - self.start_time > self.max_time

    def __del__(self):
        if self.engine:
            try:
                self.engine.quit()
            except:
                pass