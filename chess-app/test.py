# Initialize the engine
from chess_engine import Engine
engine = Engine("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -")

# Calculate the bot's move
bot_move = engine.iterative_deepening(3, max_time=5)
print(f"Bot move: {bot_move}")

# Apply the move
if engine.make_move(bot_move[:2], bot_move[2:4]):
    print(f"New FEN: {engine.board.fen()}")
else:
    print("Invalid move")