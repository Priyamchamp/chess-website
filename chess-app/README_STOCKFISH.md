# Setting Up Stockfish for Powerful Bot Play

This chess application can use the Stockfish chess engine to provide a challenging bot opponent. The bot difficulty is controlled by the depth slider in the game controls.

## Difficulty Levels

- **Depth 1**: Beginner level, makes some obvious mistakes
- **Depth 2**: Intermediate level, plays decent chess but makes tactical errors
- **Depth 3**: Advanced level, can defeat most amateur players and even challenge grandmasters
- **Depth 4**: Strong master level, can beat most humans consistently
- **Depth 5**: Virtually unbeatable, plays at super-grandmaster level

## Installing Stockfish (Automated Method)

The easiest way to set up Stockfish is to run the provided setup script:

1. Make sure you have Python installed on your system
2. Navigate to the chess-app directory in your terminal/command prompt
3. Run the setup script:

```
python setup_stockfish.py
```

This will:
- Download the appropriate Stockfish version for your operating system
- Set up the executable with the correct permissions
- Configure the chess engine to use the installed Stockfish

## Installing Stockfish (Manual Method)

If the automated script doesn't work, you can install Stockfish manually:

1. Download Stockfish from the official website: https://stockfishchess.org/download/
2. Extract the downloaded file
3. Find the Stockfish executable for your operating system:
   - Windows: `stockfish-windows-x86-64.exe`
   - macOS: `stockfish-macos-x86-64` (or `stockfish-macos-arm64` for M1/M2 Macs)
   - Linux: `stockfish-linux-x86-64`
4. Place the executable in one of these locations:
   - In the `chess-app/engines` directory (create it if it doesn't exist)
   - A standard location for your operating system

## Verifying Stockfish Installation

To verify that Stockfish is properly installed:

1. Start the chess application
2. Choose the "Player vs Bot" mode
3. Make a move as White
4. The bot should respond with a sensible move
5. Check the server console - you should NOT see error messages like "Error initializing Stockfish: Stockfish not found in any common locations"

## Troubleshooting

If you're encountering issues with Stockfish:

1. Check that the Stockfish executable has proper permissions (needs to be executable on macOS/Linux)
2. Verify the executable path in `chess_engine.py` - the `stockfish_paths` list should include the path to your Stockfish executable
3. Try running Stockfish directly from the command line to make sure it works

## Using the Strong Bot

To experience the full strength of the chess bot:

1. Start a new game against the bot
2. Increase the depth selector to level 3, 4, or 5 for a very challenging game
3. Be prepared for a tough match - at depth 3 and above, the bot can challenge even very strong players!

Enjoy your game against a formidable opponent! 