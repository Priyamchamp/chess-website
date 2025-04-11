import os
import platform
import urllib.request
import zipfile
import tarfile
import shutil
import sys

def setup_stockfish():
    """Downloads and sets up the Stockfish chess engine based on the operating system."""
    
    print("Setting up Stockfish chess engine...")
    system = platform.system().lower()
    
    # Create a directory for stockfish if it doesn't exist
    if not os.path.exists("engines"):
        os.makedirs("engines")
    
    stockfish_path = os.path.join("engines", "stockfish")
    stockfish_exe = stockfish_path
    
    # Define fallback URLs in case primary URLs fail
    fallback_urls = {
        "windows": [
            "https://github.com/official-stockfish/Stockfish/releases/download/sf_17/stockfish-windows-x86-64-avx2.zip",
            "https://github.com/official-stockfish/Stockfish/releases/download/sf_16/stockfish-windows-x86-64-avx2.zip", 
            "https://github.com/official-stockfish/Stockfish/releases/download/sf_15/stockfish-windows-x86-64-avx2.zip"
        ],
        "linux": [
            "https://github.com/official-stockfish/Stockfish/releases/download/sf_17/stockfish-ubuntu-x86-64-avx2.zip", 
            "https://github.com/official-stockfish/Stockfish/releases/download/sf_16/stockfish-ubuntu-x86-64-avx2.zip",
            "https://github.com/official-stockfish/Stockfish/releases/download/sf_15/stockfish-ubuntu-x86-64-avx2.zip"
        ],
        "darwin_arm64": [
            "https://github.com/official-stockfish/Stockfish/releases/download/sf_17/stockfish-macos-arm64.zip",
            "https://github.com/official-stockfish/Stockfish/releases/download/sf_16/stockfish-macos-x86-64-apple-silicon.zip",
            "https://github.com/official-stockfish/Stockfish/releases/download/sf_15/stockfish-macos-x86-64-apple-silicon.zip"
        ],
        "darwin_x86_64": [
            "https://github.com/official-stockfish/Stockfish/releases/download/sf_17/stockfish-macos-x86-64-avx2.zip",
            "https://github.com/official-stockfish/Stockfish/releases/download/sf_16/stockfish-macos-x86-64-modern.zip",
            "https://github.com/official-stockfish/Stockfish/releases/download/sf_15/stockfish-macos-x86-64-modern.zip"
        ]
    }
    
    def download_with_fallback(url_list, destination):
        """Try downloading from multiple URLs with fallback"""
        for url in url_list:
            try:
                print(f"Attempting to download from: {url}")
                urllib.request.urlretrieve(url, destination)
                print(f"Download successful from: {url}")
                return True
            except Exception as e:
                print(f"Download failed from {url}: {e}")
                continue
        return False
    
    if system == "windows":
        zip_file = os.path.join("engines", "stockfish.zip")
        stockfish_exe = os.path.join("engines", "stockfish-windows-x86-64-avx2.exe")
        
        # Download Stockfish with fallback
        print(f"Downloading Stockfish for Windows...")
        if not download_with_fallback(fallback_urls["windows"], zip_file):
            print("Error: Failed to download Stockfish for Windows from all sources.")
            return None
        
        try:
            # Extract the ZIP file
            with zipfile.ZipFile(zip_file, 'r') as zip_ref:
                zip_ref.extractall("engines")
            
            # Rename executable for consistency
            try:
                os.rename(stockfish_exe, os.path.join("engines", "stockfish.exe"))
                stockfish_exe = os.path.join("engines", "stockfish.exe")
            except Exception as e:
                print(f"Could not rename Stockfish executable: {e}")
                # Try to find the executable
                for root, dirs, files in os.walk("engines"):
                    for file in files:
                        if file.startswith("stockfish") and file.endswith(".exe"):
                            stockfish_exe = os.path.join(root, file)
                            print(f"Found Stockfish executable at: {stockfish_exe}")
                            break
                
            # Clean up
            os.remove(zip_file)
        except Exception as e:
            print(f"Error extracting/setting up Stockfish: {e}")
            return None
        
    elif system == "linux":
        zip_file = os.path.join("engines", "stockfish.zip")
        stockfish_exe = os.path.join("engines", "stockfish-ubuntu-x86-64-avx2")
        
        # Download Stockfish with fallback
        print(f"Downloading Stockfish for Linux...")
        if not download_with_fallback(fallback_urls["linux"], zip_file):
            print("Error: Failed to download Stockfish for Linux from all sources.")
            return None
        
        try:
            # Extract the ZIP file
            with zipfile.ZipFile(zip_file, 'r') as zip_ref:
                zip_ref.extractall("engines")
            
            # Make executable
            os.chmod(stockfish_exe, 0o755)
            
            # Clean up
            os.remove(zip_file)
        except Exception as e:
            print(f"Error extracting/setting up Stockfish: {e}")
            return None
        
    elif system == "darwin":  # macOS
        zip_file = os.path.join("engines", "stockfish.zip")
        
        if platform.machine() == "arm64":  # M1/M2 Mac
            stockfish_exe = os.path.join("engines", "stockfish-macos-arm64")
            
            # Download Stockfish with fallback
            print(f"Downloading Stockfish for M1/M2 Mac...")
            if not download_with_fallback(fallback_urls["darwin_arm64"], zip_file):
                print("Error: Failed to download Stockfish for M1/M2 Mac from all sources.")
                return None
        else:  # Intel Mac
            stockfish_exe = os.path.join("engines", "stockfish-macos-x86-64-avx2")
            
            # Download Stockfish with fallback
            print(f"Downloading Stockfish for Intel Mac...")
            if not download_with_fallback(fallback_urls["darwin_x86_64"], zip_file):
                print("Error: Failed to download Stockfish for Intel Mac from all sources.")
                return None
        
        try:
            # Extract the ZIP file
            with zipfile.ZipFile(zip_file, 'r') as zip_ref:
                zip_ref.extractall("engines")
            
            # Make executable
            os.chmod(stockfish_exe, 0o755)
            
            # Clean up
            os.remove(zip_file)
        except Exception as e:
            print(f"Error extracting/setting up Stockfish: {e}")
            return None
            
    else:
        print(f"Unsupported operating system: {system}")
        print("Stockfish can be manually downloaded from: https://stockfishchess.org/download/")
        return None
    
    # Test that Stockfish works
    import subprocess
    try:
        process = subprocess.Popen(
            stockfish_exe, 
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True
        )
        
        # Send "quit" command and wait for process to terminate
        process.communicate("quit\n")
        print("✅ Stockfish installed successfully!")
        
        # Update chess_engine.py to use the correct path
        update_engine_path(stockfish_exe)
        
        return stockfish_exe
    except Exception as e:
        print(f"❌ Error testing Stockfish: {e}")
        print("Please try downloading Stockfish manually from: https://stockfishchess.org/download/")
        print("Then place the executable in the 'engines' folder and update chess_engine.py")
        return None

def update_engine_path(stockfish_path):
    """Updates the chess_engine.py file with the correct Stockfish path."""
    try:
        engine_file = "chess_engine.py"
        with open(engine_file, 'r') as file:
            content = file.read()
        
        # Replace the stockfish paths with our new path
        # Convert Windows backslashes to forward slashes for compatibility
        safe_path = stockfish_path.replace("\\", "/")
        modified_content = content.replace(
            'stockfish_paths = [',
            f'stockfish_paths = [\n                "{safe_path}",'
        )
        
        with open(engine_file, 'w') as file:
            file.write(modified_content)
            
        print(f"Updated chess_engine.py with Stockfish path: {stockfish_path}")
    except Exception as e:
        print(f"Error updating chess_engine.py: {e}")

if __name__ == "__main__":
    setup_stockfish() 