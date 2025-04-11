from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from chess_engine import Engine
import threading
import time
import uuid
from collections import deque
import logging
from datetime import datetime
import random
import os
import chess
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check for Stockfish installation
try:
    engine = Engine()
    has_stockfish = engine.engine is not None
    if not has_stockfish:
        print("\n" + "="*80)
        print(" WARNING: Stockfish chess engine not found!")
        print(" Bot play will use a much weaker fallback engine.")
        print(" For stronger bot opponents, install Stockfish using:")
        print(" python setup_stockfish.py")
        print(" See README_STOCKFISH.md for more details.")
        print("="*80 + "\n")
    else:
        print("\n" + "="*80)
        print(" ✅ Stockfish chess engine found and working!")
        print(" Bot play will use Stockfish for strong analysis at different depths.")
        print(" Use the depth selector (1-5) to control bot difficulty.")
        print(" At depth 3+, the bot can challenge even grandmaster players!")
        print("="*80 + "\n")
except Exception as e:
    print(f"Error checking Stockfish: {e}")

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key')
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route('/health')
def health_check():
    return jsonify({'status': 'ok'}), 200

# Store ongoing games and game states
games = {}
game_states = {}
move_history = {}
player_sockets = {}
socket_players = {}
connected_players = set()
matchmaking_queue = deque()
MAX_CONNECTIONS_PER_IP = 3  # Maximum connections allowed per IP address

def cleanup_player_connections(socket_id, user_id=None):
    """Clean up all connections for a player"""
    try:
        global matchmaking_queue
        
        if socket_id in player_sockets:
            if user_id is None:
                user_id = player_sockets[socket_id]
            del player_sockets[socket_id]
            
        if user_id:
            connected_players.discard(user_id)
            if user_id in socket_players:
                del socket_players[user_id]
            
            # Remove from matchmaking queue
            matchmaking_queue = deque([p for p in matchmaking_queue if p['userId'] != user_id])
            
            # Leave all game rooms
            for game_id in games:
                if user_id in games[game_id].players:
                    games[game_id].players.remove(user_id)
                    leave_room(game_id)
                    if len(games[game_id].players) == 0:
                        del games[game_id]
                    else:
                        emit('player_left', {
                            'userId': user_id,
                            'players': games[game_id].players
                        }, room=game_id)
            
            logger.info(f'Cleaned up connections for player: {user_id}')
    except Exception as e:
        logger.error(f"Error in cleanup_player_connections: {str(e)}")

@socketio.on('connect')
def handle_connect():
    try:
        client_ip = request.remote_addr
        socket_id = request.sid
        
        # Check connection limit
        current_connections = sum(1 for sid in player_sockets if sid.startswith(client_ip))
        if current_connections >= MAX_CONNECTIONS_PER_IP:
            logger.warning(f'Connection limit reached for IP: {client_ip}')
            return False  # Reject connection
        
        logger.info(f'Client connected: {socket_id} from IP: {client_ip}')
        player_sockets[socket_id] = None
        return True
    except Exception as e:
        logger.error(f"Error in handle_connect: {str(e)}")
        return False

@socketio.on('disconnect')
def handle_disconnect():
    try:
        socket_id = request.sid
        user_id = player_sockets.get(socket_id)
        cleanup_player_connections(socket_id, user_id)
        logger.info(f'Client disconnected: {socket_id}')
    except Exception as e:
        logger.error(f"Error in handle_disconnect: {str(e)}")

class Game:
    def __init__(self, game_id, players, mode='online'):
        self.id = game_id
        self.players = players
        self.mode = mode
        self.board = chess.Board()
        self.moves = []
        self.status = "active"
        self.current_turn = players[0]  # White starts
        self.engine = None
        self.last_activity = datetime.now()  # Add last_activity tracking
        if mode == 'bot':
            self.engine = Engine()
            
    @property
    def fen(self):
        return self.board.fen()
        
    def is_legal_move(self, move):
        return move in self.board.legal_moves
        
    def push(self, move):
        if not self.is_legal_move(move):
            raise ValueError("Illegal move")
        self.board.push(move)
        self.last_activity = datetime.now()  # Update last_activity on move
        
    def is_check(self):
        return self.board.is_check()
        
    def is_checkmate(self):
        return self.board.is_checkmate()
        
    def is_stalemate(self):
        return self.board.is_stalemate()
        
    def is_insufficient_material(self):
        return self.board.is_insufficient_material()
        
    def is_game_over(self):
        return self.board.is_game_over()
        
    def turn(self):
        return self.board.turn
        
    def get_legal_moves(self, square):
        """Get all legal moves for a piece on the given square"""
        moves = []
        for move in self.board.legal_moves:
            if move.from_square == chess.parse_square(square):
                moves.append(chess.square_name(move.to_square))
        return moves
        
    def to_dict(self):
        """Convert game state to dictionary for client"""
        return {
            'id': self.id,
            'players': self.players,
            'mode': self.mode,
            'fen': self.fen,
            'status': self.status,
            'currentTurn': self.current_turn,
            'moves': self.moves,
            'isCheck': self.is_check(),
            'isCheckmate': self.is_checkmate(),
            'isStalemate': self.is_stalemate(),
            'isGameOver': self.is_game_over(),
            'lastActivity': self.last_activity.isoformat()  # Include last_activity in game state
        }
        
    def cleanup(self):
        """Cleanup resources when game ends"""
        if self.engine:
            self.engine.cleanup()
            self.engine = None

def broadcast_game_state(game_id):
    """Broadcast the current game state to all players in the game"""
    try:
        if game_id in games:
            game = games[game_id]
            state = game.to_dict()
            state.update({
                'gameId': game_id,
                'moveCount': len(game.moves)
            })
            socketio.emit('game_state_update', state, room=game_id)
    except Exception as e:
        logger.error(f"Error in broadcast_game_state: {str(e)}")
        # Don't raise the exception - just log it to prevent move errors

@socketio.on('move')
def handle_move(data):
    """Handle a move from a client"""
    try:
        # Extract and validate required data
        game_id = data.get('game_id')
        user_id = data.get('user_id')
        from_square = data.get('from')
        to_square = data.get('to')
        
        logger.info(f"Received move: {from_square} to {to_square} from user {user_id} in game {game_id}")
        
        if not all([game_id, user_id, from_square, to_square]):
            logger.error(f"Missing move data: {data}")
            return {'error': 'Missing required move data'}
            
        # Get and validate game
        game = games.get(game_id)
        if not game:
            logger.error(f"Game not found: {game_id}")
            return {'error': 'Game not found'}
            
        # Validate it's the player's turn
        if game.current_turn != user_id:
            logger.error(f"Not player's turn. Current turn: {game.current_turn}, Player: {user_id}")
            return {'error': 'Not your turn'}
            
        try:
            # Create and validate move
            move = chess.Move.from_uci(f"{from_square}{to_square}")
            if not game.is_legal_move(move):
                logger.error(f"Illegal move attempted: {from_square}{to_square}")
                return {'error': 'Illegal move'}
                
            # Make the move
            game.push(move)
            
            # Update game state
            move_info = {
                'from': from_square,
                'to': to_square,
                'fen': game.fen
            }
            game.moves.append(move_info)
            
            # Update current turn before broadcasting
            next_turn = game.players[1] if game.current_turn == game.players[0] else game.players[0]
            game.current_turn = next_turn
            
            # Ensure FEN string is properly formatted (all 6 parts)
            fen_parts = game.fen.split(' ')
            if len(fen_parts) < 6:
                # Add any missing parts to ensure a complete FEN string
                if len(fen_parts) < 2:
                    fen_parts.append('w' if game.board.turn == chess.WHITE else 'b')
                if len(fen_parts) < 3:
                    # Generate castling rights string manually
                    castling = ""
                    if game.board.has_kingside_castling_rights(chess.WHITE):
                        castling += "K"
                    if game.board.has_queenside_castling_rights(chess.WHITE):
                        castling += "Q"
                    if game.board.has_kingside_castling_rights(chess.BLACK):
                        castling += "k"
                    if game.board.has_queenside_castling_rights(chess.BLACK):
                        castling += "q"
                    fen_parts.append(castling if castling else "-")
                if len(fen_parts) < 4:
                    fen_parts.append('-' if game.board.ep_square is None else chess.square_name(game.board.ep_square))
                if len(fen_parts) < 5:
                    fen_parts.append(str(game.board.halfmove_clock))
                if len(fen_parts) < 6:
                    fen_parts.append(str(game.board.fullmove_number))
                
                full_fen = ' '.join(fen_parts)
            else:
                full_fen = game.fen
            
            # Prepare move data for broadcast
            move_data = {
                'from': from_square,
                'to': to_square,
                'fen': full_fen,
                'is_check': game.is_check(),
                'is_checkmate': game.is_checkmate(),
                'is_stalemate': game.is_stalemate(),
                'is_insufficient_material': game.is_insufficient_material(),
                'is_game_over': game.is_game_over(),
                'currentTurn': next_turn,
                'lastMove': {'from': from_square, 'to': to_square},
                'timestamp': int(time.time() * 1000)  # Add timestamp in milliseconds
            }
            
            logger.info(f"Broadcasting move to room {game_id}: {move_data}")
            
            # Emit move to all players in the game room using socketio instead of emit
            # This ensures all clients in the room receive the move
            socketio.emit('move_made', move_data, room=game_id)
            
            try:
                # Update game state for all players
                broadcast_game_state(game_id)
            except Exception as e:
                logger.error(f"Error broadcasting game state: {str(e)}")
                # Continue even if broadcast fails
            
            # Check for game end conditions
            if game.is_game_over():
                winner = None
                if game.is_checkmate():
                    winner = 'black' if game.turn() == chess.WHITE else 'white'
                elif game.is_stalemate() or game.is_insufficient_material():
                    winner = 'draw'
                    
                if winner:
                    game.status = "completed"
                    socketio.emit('game_over', {
                        'winner': winner,
                        'reason': 'checkmate' if game.is_checkmate() else 
                                'stalemate' if game.is_stalemate() else 
                                'insufficient_material'
                    }, room=game_id)
                    
            return {'success': True, 'move': move_data}
                    
        except ValueError as e:
            logger.error(f"Invalid move format: {str(e)}")
            return {'error': f'Invalid move format: {str(e)}'}
            
    except Exception as e:
        logger.error(f"Error in handle_move: {str(e)}")
        return {'error': 'Failed to make move'}

@socketio.on('validate_move')
def handle_validate_move(data):
    try:
        game_id = data['gameId']
        move = data['move']
        
        game = games.get(game_id)
        if not game:
            return {'valid': False}

        engine = Engine(game.fen)
        valid = engine.make_move(move['from'], move['to'])
        return {'valid': valid}

    except Exception as e:
        logger.error(f"Error in handle_validate_move: {str(e)}")
        return {'valid': False}

@socketio.on('get_game_state')
def handle_get_game_state(data):
    try:
        game_id = data['gameId']
        game = games.get(game_id)
        if game:
            return game.to_dict()
        return {'error': 'Game not found'}
    except Exception as e:
        logger.error(f"Error in handle_get_game_state: {str(e)}")
        return {'error': str(e)}

@socketio.on('create_game')
def handle_create_game(data):
    try:
        user_id = data['userId']
        game_type = data.get('gameType', 'pvp')
        
        game = Game(user_id, game_type)
        games[game.id] = game
            
        join_room(game.id)
        emit('game_created', {
            'gameId': game.id,
            'gameType': game_type,
            'fen': game.fen
        })
        
        logger.info(f'Game created: {game.id} by {user_id}')
        
    except Exception as e:
        logger.error(f"Error in create_game: {str(e)}")
        emit('error', {'message': 'Failed to create game'})

@socketio.on('join_game')
def handle_join_game(data):
    try:
        game_id = data['gameId']
        user_id = data['userId']
        
        game = games.get(game_id)
        if not game:
            return {'error': 'Game not found'}

        if len(game.players) >= 2:
            return {'error': 'Game is full'}

        if user_id in game.players:
            return {'error': 'Already in game'}

        # Join the game room first
        join_room(game_id)

        # Add player to game
        game.players.append(user_id)
        
        # If this is the second player, assign colors and start game
        if len(game.players) == 2:
            # First player is white, second player is black
            white_player = game.players[0]
            black_player = game.players[1]
            game.current_turn = white_player  # White moves first
            
            # Notify players of their colors
            emit('color_assigned', {
                'color': 'white',
                'gameId': game_id
            }, room=socket_players[white_player])
            
            emit('color_assigned', {
                'color': 'black',
                'gameId': game_id
            }, room=socket_players[black_player])
            
            # Broadcast game start to all players
            emit('game_started', {
                'gameId': game_id,
                'players': game.players,
                'currentTurn': game.current_turn
            }, room=game_id)
            
            logger.info(f'Game {game_id} started. White: {white_player}, Black: {black_player}')
            
            return {
                'success': True,
                'gameId': game_id,
                'players': game.players,
                'color': 'black'  # Second player gets black
            }
        else:
            # First player joins
            emit('color_assigned', {
                'color': 'white',
                'gameId': game_id
            }, room=user_id)
            
            emit('waiting_for_opponent', {
                'gameId': game_id
            }, room=game_id)
            
            logger.info(f'First player {user_id} joined game {game_id}')
            
            return {
                'success': True,
                'gameId': game_id,
                'players': game.players,
                'color': 'white'  # First player gets white
            }
            
    except Exception as e:
        logger.error(f"Error in handle_join_game: {str(e)}")
        return {'error': 'Failed to join game'}

@socketio.on('leave_game')
def handle_leave_game(data):
    try:
        game_id = data['gameId']
        user_id = data['userId']
        
        game = games.get(game_id)
        if game:
            if user_id in game.players:
                game.players.remove(user_id)
                leave_room(game_id)
                
                if len(game.players) == 0:
                    game.status = "abandoned"
                    del games[game_id]
                else:
                    emit('player_left', {
                        'userId': user_id,
                        'players': game.players
                    }, room=game_id)
                
                logger.info(f'Player {user_id} left game {game_id}')
                
    except Exception as e:
        logger.error(f"Error in leave_game: {str(e)}")
        emit('error', {'message': 'Failed to leave game'})

@socketio.on('join_matchmaking')
def handle_join_matchmaking(data):
    try:
        user_id = data['userId']
        socket_id = request.sid
        rating = data.get('rating', 1200)  # Get the player's rating, default to 1200
        preferences = data.get('preferences', {})  # Game preferences
        
        logger.info(f'Player {user_id} joined matchmaking with rating {rating}')
        
        # Store player socket mapping
        player_sockets[socket_id] = user_id
        socket_players[user_id] = socket_id
        
        # Add player to matchmaking queue with rating
        player_data = {
            'userId': user_id, 
            'socketId': socket_id,
            'rating': rating,
            'preferences': preferences,
            'timestamp': time.time()
        }
        matchmaking_queue.append(player_data)
        
        # Immediately try to find a match
        find_match()
        
        # Notify the player they've joined the queue
        emit('matchmaking_joined', {
            'position': len(matchmaking_queue),
            'queueId': user_id,  # Use userId as queue ID for simplicity
            'timestamp': player_data['timestamp']
        })
        
        logger.info(f'Player {user_id} added to matchmaking queue. Queue size: {len(matchmaking_queue)}')
        
    except Exception as e:
        logger.error(f"Error in join_matchmaking: {str(e)}")
        emit('error', {'message': f'Failed to join matchmaking: {str(e)}'})

def find_match():
    """Find matches for players in the queue"""
    try:
        global matchmaking_queue
        
        if len(matchmaking_queue) < 2:
            return  # Not enough players to match
            
        # Sort by waiting time (oldest first)
        sorted_queue = sorted(matchmaking_queue, key=lambda p: p['timestamp'])
        
        # For each player, try to find a suitable opponent
        matched_players = set()
        matches = []
        
        for i, player in enumerate(sorted_queue):
            if player['userId'] in matched_players:
                continue  # Player already matched
                
            # Define rating range (±200 points)
            rating = player['rating']
            min_rating = rating - 200
            max_rating = rating + 200
            
            # Find opponents within rating range
            for j in range(i + 1, len(sorted_queue)):
                opponent = sorted_queue[j]
                
                if (opponent['userId'] not in matched_players and 
                    opponent['rating'] >= min_rating and 
                    opponent['rating'] <= max_rating):
                    
                    # Match found!
                    matched_players.add(player['userId'])
                    matched_players.add(opponent['userId'])
                    
                    matches.append((player, opponent))
                    break
        
        # Create games for all matches
        for player1, player2 in matches:
            create_game_for_match(player1, player2)
            
        # Remove matched players from queue
        matchmaking_queue = deque([p for p in matchmaking_queue if p['userId'] not in matched_players])
        
        # Update queue positions for remaining players
        for i, player in enumerate(matchmaking_queue):
            socket_id = player['socketId']
            emit('queue_update', {
                'position': i + 1,
                'estimatedWaitTime': (i + 1) * 15  # Rough estimate: 15 seconds per position
            }, room=socket_id)
            
        logger.info(f'Matchmaking completed: {len(matches)} matches created, {len(matchmaking_queue)} players still waiting')
        
    except Exception as e:
        logger.error(f"Error in find_match: {str(e)}")

def create_game_for_match(player1, player2):
    """Create a game between two matched players"""
    try:
        # Generate a unique game ID
        game_id = str(uuid.uuid4())
        
        # Randomly decide colors
        if random.choice([True, False]):
            white_player = player1['userId']
            black_player = player2['userId']
            white_socket = player1['socketId']
            black_socket = player2['socketId']
        else:
            white_player = player2['userId']
            black_player = player1['userId']
            white_socket = player2['socketId']
            black_socket = player1['socketId']
        
        # Create and set up the game
        game = Game(game_id, [white_player, black_player])
        game.current_turn = white_player  # White moves first
        games[game_id] = game
        
        # Have players join the game room
        join_room(game_id, sid=white_socket)
        join_room(game_id, sid=black_socket)
        
        # Notify players of their colors and the match
        emit('color_assigned', {
            'color': 'white',
            'gameId': game_id
        }, room=white_socket)
        
        emit('color_assigned', {
            'color': 'black',
            'gameId': game_id
        }, room=black_socket)
        
        # Notify both players about the match and opponent
        emit('match_found', {
            'gameId': game_id,
            'opponent': black_player,
            'opponentRating': player2['rating'] if white_player == player1['userId'] else player1['rating'],
            'color': 'white'
        }, room=white_socket)
        
        emit('match_found', {
            'gameId': game_id,
            'opponent': white_player,
            'opponentRating': player1['rating'] if black_player == player2['userId'] else player2['rating'],
            'color': 'black'
        }, room=black_socket)
        
        # Broadcast initial game state
        game_state = game.to_dict()
        emit('game_state_update', game_state, room=game_id)
        
        # Broadcast game start
        emit('game_started', {
            'gameId': game_id,
            'players': game.players,
            'currentTurn': game.current_turn
        }, room=game_id)
        
        logger.info(f'Game created: {game_id} - White: {white_player} vs Black: {black_player}')
        
    except Exception as e:
        logger.error(f"Error creating game for match: {str(e)}")
        emit('error', {'message': f'Failed to create game: {str(e)}'}, room=player1['socketId'])
        emit('error', {'message': f'Failed to create game: {str(e)}'}, room=player2['socketId'])

@socketio.on('leave_matchmaking')
def handle_leave_matchmaking(data):
    try:
        global matchmaking_queue
        
        user_id = data['userId']
        logger.info(f'Player {user_id} requested to leave matchmaking')
        
        # Remove player from matchmaking queue
        matchmaking_queue = deque([p for p in matchmaking_queue if p['userId'] != user_id])
        
        # Notify the player they've left the queue
        emit('matchmaking_left', {'success': True})
        
        logger.info(f'Player {user_id} left matchmaking. Queue size: {len(matchmaking_queue)}')
        
    except Exception as e:
        logger.error(f"Error in leave_matchmaking: {str(e)}")
        emit('error', {'message': f'Failed to leave matchmaking: {str(e)}'})

@app.route('/api/bot-move', methods=['POST', 'OPTIONS'])
def bot_move():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.get_json()
        if not data or 'fen' not in data:
            return jsonify({'error': 'Missing FEN string'}), 400
            
        fen = data['fen']
        depth = data.get('depth', 3)
        
        try:
            engine = Engine()
            move = engine.get_best_move(fen, depth)
            
            if not move:
                return jsonify({'error': 'No valid move found'}), 400
                
            return jsonify({'move': move})
        except Exception as e:
            logger.error(f"Error in bot_move: {str(e)}")
            return jsonify({'error': f'Engine error: {str(e)}'}), 500
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        engine = Engine()
        move = engine.get_best_move(fen, depth)
        
        if not move:
            return jsonify({'error': 'No valid move found'}), 400
            
        return jsonify({'move': move})
    except Exception as e:
        logger.error(f"Error in bot_move: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting Flask-SocketIO server on port 3002...")
    socketio.run(app, host='0.0.0.0', port=3002, debug=True, allow_unsafe_werkzeug=True)