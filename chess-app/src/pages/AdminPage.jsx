import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaDatabase, FaChevronLeft, FaChessKing } from 'react-icons/fa';
import toast from 'react-hot-toast';
import initializeFirestore from '../scripts/initializeFirestore';
import { useAuth } from '../contexts/AuthContext';

function AdminPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Check if user is authenticated
  React.useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);
  
  const handleInitializeFirestore = async () => {
    try {
      setIsInitializing(true);
      toast.loading('Initializing Firestore with sample data...', { id: 'firestore-init' });
      
      await initializeFirestore();
      
      toast.success('Firestore initialized successfully!', { id: 'firestore-init' });
    } catch (error) {
      console.error('Error initializing Firestore:', error);
      toast.error(`Failed to initialize Firestore: ${error.message}`, { id: 'firestore-init' });
    } finally {
      setIsInitializing(false);
    }
  };
  
  const handleBackToHome = () => {
    navigate('/');
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      {/* Background chess pieces */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: -100, 
              opacity: 0.2,
              rotate: Math.random() * 360
            }}
            animate={{ 
              y: window.innerHeight + 100,
              opacity: [0.2, 0.5, 0.2],
              rotate: Math.random() * 720
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 15 + Math.random() * 20,
              delay: i * 2
            }}
            className="absolute text-indigo-200"
            style={{ fontSize: 30 + Math.random() * 50 }}
          >
            <FaChessKing />
          </motion.div>
        ))}
      </div>
      
      <div className="container mx-auto max-w-4xl">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleBackToHome}
          className="mb-8 bg-white rounded-full p-2 shadow-md inline-flex items-center justify-center"
        >
          <FaChevronLeft className="text-indigo-600" />
          <span className="ml-2 text-indigo-600 font-medium">Back to Home</span>
        </motion.button>
        
        <motion.div 
          className="bg-white rounded-xl shadow-xl overflow-hidden p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Panel</h1>
          
          <div className="space-y-8">
            <div className="p-6 bg-indigo-50 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Firebase Management</h2>
              <p className="text-gray-600 mb-6">
                Initialize your Firestore database with sample data for testing. This will create sample players, 
                ratings, game rooms, and other necessary data for your chess application.
              </p>
              
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleInitializeFirestore}
                disabled={isInitializing}
                className={`bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center justify-center transition-colors ${
                  isInitializing ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                <FaDatabase className="mr-2" />
                {isInitializing ? 'Initializing...' : 'Initialize Firestore with Sample Data'}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default AdminPage; 