import { animate, motion } from 'framer-motion';

// Safer sound loading that handles missing files gracefully
const loadSound = (src) => {
  try {
    const sound = new Audio(src);
    sound.preload = 'auto';
    
    // Handle loading errors
    sound.onerror = () => {
      console.warn(`Failed to load sound: ${src}`);
    };
    
    return sound;
  } catch (err) {
    console.warn(`Error initializing sound ${src}:`, err);
    return null;
  }
};

// Sound effects with fallbacks
const createSoundObject = () => {
  const placeholderAudio = new Audio();
  
  return {
    move: loadSound('/sounds/move.mp3') || placeholderAudio,
    capture: loadSound('/sounds/capture.mp3') || placeholderAudio,
    check: loadSound('/sounds/check.mp3') || placeholderAudio,
    castle: loadSound('/sounds/castle.mp3') || placeholderAudio,
    promote: loadSound('/sounds/promote.mp3') || placeholderAudio,
    gameStart: loadSound('/sounds/game-start.mp3') || placeholderAudio,
    gameEnd: loadSound('/sounds/game-end.mp3') || placeholderAudio,
  };
};

// Expose the sounds object
export const sounds = createSoundObject();

// Play sound with volume control and better error handling
export const playSound = (sound, volume = 0.5) => {
  if (!sound) return;
  
  // Check if sound is enabled in localStorage
  const soundEnabled = localStorage.getItem('chessSoundEnabled');
  if (soundEnabled === 'false') return;
  
  try {
    // Use a new Audio object every time to avoid issues with multiple plays
    const soundClone = sound.cloneNode();
    soundClone.volume = volume;
    
    // Add a proper error handler that won't flood the console
    soundClone.play().catch(err => {
      // Only log the error if it's not the expected autoplay restriction
      if (!err.message.includes('user didn\'t interact') && 
          !err.message.includes('user gesture')) {
        console.error('Sound play error:', err);
      }
    });
  } catch (err) {
    // Only log serious errors
    console.error('Sound error:', err);
  }
};

// Animation variants for chess pieces
export const pieceVariants = {
  initial: (custom) => ({
    scale: custom ? 0.8 : 1,
    opacity: custom ? 0 : 1,
    y: custom ? -10 : 0,
  }),
  animate: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 25,
      mass: 1
    }
  },
  exit: {
    scale: 0.8,
    opacity: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25
    }
  },
  hover: {
    scale: 1.05,
    y: -5,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 10
    }
  },
  drag: {
    scale: 1.1,
    zIndex: 10,
    boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.3)',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 15
    }
  }
};

// Animation for move indicators
export const moveIndicatorVariants = {
  initial: {
    scale: 0,
    opacity: 0
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 25
    }
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: {
      duration: 0.2
    }
  }
};

// Spring animation for piece movement
export const springTransition = {
  type: 'spring',
  stiffness: 350,
  damping: 25,
  mass: 1
};

// Animate a piece moving from one square to another
export const animatePieceMovement = (fromRect, toRect, element, isCapture = false) => {
  if (!fromRect || !toRect || !element) return;
  
  // Calculate the difference
  const deltaX = fromRect.x - toRect.x;
  const deltaY = fromRect.y - toRect.y;
  
  // Play the appropriate sound
  playSound(isCapture ? sounds.capture : sounds.move);
  
  // Animate with spring physics
  animate(element, {
    x: [-deltaX, 0],
    y: [-deltaY, 0],
    scale: isCapture ? [1.1, 1] : [1, 1],
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
      mass: 1
    }
  });
};

// Animation for highlighting the last move
export const lastMoveHighlight = {
  initial: {
    backgroundColor: 'rgba(255, 255, 0, 0)',
    boxShadow: '0 0 0px rgba(255, 255, 0, 0)'
  },
  animate: {
    backgroundColor: ['rgba(255, 255, 0, 0.3)', 'rgba(255, 255, 0, 0.1)'],
    boxShadow: [
      '0 0 10px rgba(255, 255, 0, 0.5)',
      '0 0 5px rgba(255, 255, 0, 0.2)'
    ],
    transition: {
      duration: 1.5,
      repeat: 0,
      ease: 'easeOut'
    }
  }
};

// Animation for check highlight
export const checkHighlight = {
  initial: {
    boxShadow: '0 0 0px rgba(255, 0, 0, 0)'
  },
  animate: {
    boxShadow: [
      '0 0 15px rgba(255, 0, 0, 0.7)',
      '0 0 8px rgba(255, 0, 0, 0.5)'
    ],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      repeatType: 'reverse'
    }
  }
};

// Animation for promotion selection
export const promotionVariants = {
  container: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        duration: 0.3,
        staggerChildren: 0.1 
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9,
      transition: { 
        duration: 0.2,
        staggerChildren: 0.05,
        staggerDirection: -1 
      }
    }
  },
  item: {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: 'spring',
        stiffness: 300,
        damping: 25 
      }
    },
    exit: { 
      opacity: 0, 
      y: 10,
      transition: { 
        duration: 0.2 
      }
    },
    hover: {
      scale: 1.1,
      y: -5,
      transition: { 
        type: 'spring',
        stiffness: 300,
        damping: 15 
      }
    }
  }
};

// Function to create floating chess pieces for background animation
export const createFloatingPiece = (index) => {
  const pieces = ['♚', '♛', '♜', '♝', '♞', '♟', '♔', '♕', '♖', '♗', '♘', '♙'];
  const size = Math.random() * 30 + 20;
  const duration = Math.random() * 20 + 30;
  const initialX = Math.random() * 100;
  const initialY = Math.random() * 100;
  const initialRotate = Math.random() * 360;
  const piece = pieces[index % pieces.length];
  
  return {
    piece,
    size,
    duration,
    initialX,
    initialY,
    initialRotate,
    floatingAnimation: {
      x: [initialX + '%', (initialX + Math.random() * 20 - 10) + '%'],
      y: [initialY + '%', (initialY + Math.random() * 20 - 10) + '%'],
      rotate: [initialRotate, initialRotate + (Math.random() > 0.5 ? 360 : -360)],
      opacity: [0.15, 0.05, 0.15],
      transition: {
        duration,
        repeat: Infinity,
        repeatType: 'reverse',
        ease: 'easeInOut'
      }
    }
  };
}; 