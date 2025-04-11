import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoginForm from '../components/LoginForm';
import { FaChessPawn, FaChessKnight, FaChessRook, FaChessBishop, FaChessQueen, FaChessKing } from 'react-icons/fa';

// Chess piece components with animations
const ChessPiece = ({ Icon, delay, x, y, size }) => (
  <motion.div
    className="absolute text-white opacity-20 pointer-events-none"
    initial={{ opacity: 0, scale: 0, x, y: y - 100 }}
    animate={{
      opacity: [0.1, 0.2, 0.1],
      scale: [1, 1.2, 1],
      y,
      rotate: Math.random() * 360
    }}
    transition={{
      duration: 15 + Math.random() * 10,
      repeat: Infinity,
      delay
    }}
    style={{ fontSize: size }}
  >
    <Icon />
  </motion.div>
);

const LoginPage = () => {
  const [mounted, setMounted] = useState(false);
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    setMounted(true);
    
    // Generate random chess pieces for background
    const icons = [FaChessPawn, FaChessKnight, FaChessRook, FaChessBishop, FaChessQueen, FaChessKing];
    const newPieces = [];
    
    for (let i = 0; i < 20; i++) {
      newPieces.push({
        id: i,
        Icon: icons[Math.floor(Math.random() * icons.length)],
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        delay: i * 0.2,
        size: 20 + Math.random() * 60
      });
    }
    
    setPieces(newPieces);
  }, []);
  
  return (
    <div className="min-h-screen overflow-hidden relative bg-gradient-to-br from-blue-900 via-indigo-800 to-purple-900">
      {/* Moving background with chess board pattern */}
      <div className="absolute inset-0 opacity-10">
        <motion.div 
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.2)_0%,_transparent_70%)]"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5 }}
        />
        <motion.div
          className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuLWNoZXNzIiB4PSIwIiB5PSIwIiB3aWR0aD0iODAiIGhlaWdodD0iODAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSgwKSI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZmZmZmZmIj48L3JlY3Q+PHJlY3QgeD0iNDAiIHk9IjQwIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiNmZmZmZmYiPjwvcmVjdD48L3BhdHRlcm4+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuLWNoZXNzKSI+PC9yZWN0Pjwvc3ZnPg==')]"
          animate={{ 
            y: [0, 10, 0, -10, 0],
            x: [0, 10, 0, -10, 0],
          }}
          transition={{ 
            duration: 20,
            ease: "linear",
            repeat: Infinity
          }}
        />
      </div>
      
      {/* Floating chess pieces */}
      {mounted && pieces.map((piece) => (
        <ChessPiece 
          key={piece.id} 
          Icon={piece.Icon} 
          delay={piece.delay} 
          x={piece.x} 
          y={piece.y} 
          size={piece.size} 
        />
      ))}
      
      {/* Login form container */}
      <div className="container mx-auto px-4 py-12 min-h-screen flex flex-col items-center justify-center relative z-10">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mb-8 text-center"
        >
          <motion.h1 
            className="text-5xl font-bold text-white mb-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            CheckmateX
          </motion.h1>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100px" }}
            transition={{ duration: 1, delay: 0.9 }}
            className="h-1 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mx-auto mb-4"
          />
          <motion.p 
            className="text-blue-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            Sign in to access your chess account
          </motion.p>
        </motion.div>
        
        {/* Login form with staggered animation */}
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="w-full max-w-md relative"
          >
            {/* Glowing effect behind the form */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-2xl blur-xl"
              animate={{ 
                boxShadow: ["0 0 20px rgba(60, 100, 255, 0.3)", "0 0 40px rgba(140, 80, 255, 0.5)", "0 0 20px rgba(60, 100, 255, 0.3)"],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            
            <LoginForm />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LoginPage; 