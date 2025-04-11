import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGithub, FaGoogle, FaChessKing, FaChessQueen, FaEnvelope, FaLock, FaUser } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// Animation variants
const formVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5 }
  }
};

const buttonVariants = {
  idle: { scale: 1 },
  hover: { scale: 1.05, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" },
  tap: { scale: 0.98 }
};

function LoginForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    gamingName: '',
  });
  const [loading, setLoading] = useState(false);
  const { login, signup, loginWithGoogle, loginWithGithub, setGamingName } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    
    try {
      await login(formData.email, formData.password);
      // Add a timeout to ensure auth state is fully updated before navigation
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 500);
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      // Add a timeout to ensure auth state is fully updated before navigation
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 500);
    } catch (error) {
      console.error('Google login error:', error);
      toast.error(error.message || 'Failed to log in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setLoading(true);
    try {
      await loginWithGithub();
      // Add a timeout to ensure auth state is fully updated before navigation
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 500);
    } catch (error) {
      console.error('GitHub login error:', error);
      toast.error(error.message || 'Failed to log in with GitHub');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleMode = () => {
    setIsLogin(!isLogin);
    // Reset form data when switching modes
    setFormData({
      email: '',
      password: '',
      gamingName: '',
    });
  };

  return (
    <motion.div
      className="bg-white rounded-2xl p-8 shadow-xl w-full max-w-md mx-auto relative z-10 backdrop-blur-sm bg-white/90"
      initial="hidden"
      animate="visible"
      variants={formVariants}
    >
      <div className="text-center mb-6">
        <motion.div 
          className="flex justify-center gap-3 mb-4"
          initial={{ rotate: -10, scale: 0.5 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 260, 
            damping: 20,
            delay: 0.3
          }}
        >
          <motion.div whileHover={{ rotate: -15, y: -5 }} className="text-indigo-600">
            <FaChessKing size={36} />
          </motion.div>
          <motion.div whileHover={{ rotate: 15, y: -5 }} className="text-indigo-600">
            <FaChessQueen size={36} />
          </motion.div>
        </motion.div>
        <motion.h2 
          className="text-2xl font-bold text-gray-800 mb-2"
          variants={itemVariants}
        >
          {isLogin ? 'Welcome Back!' : 'Create Account'}
        </motion.h2>
        <motion.p 
          className="text-gray-600"
          variants={itemVariants}
        >
          {isLogin ? 'Login to access your games' : 'Join our chess community'}
        </motion.p>
      </div>

      <motion.form 
        onSubmit={handleSubmit} 
        className="space-y-5"
        variants={formVariants}
      >
        <AnimatePresence mode="wait">
          {!isLogin && (
            <motion.div
              key="gamingName"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <motion.div variants={itemVariants}>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Gaming Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaUser className="text-gray-400" />
                  </div>
                  <motion.input
                    type="text"
                    value={formData.gamingName}
                    onChange={(e) => setFormData({ ...formData, gamingName: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    placeholder="Choose a gaming name"
                    required={!isLogin}
                    whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.2)" }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This name will be displayed to other players
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div variants={itemVariants}>
          <label className="block text-gray-700 text-sm font-medium mb-1">
            Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaEnvelope className="text-gray-400" />
            </div>
            <motion.input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter your email"
              required
              whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.2)" }}
            />
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <label className="block text-gray-700 text-sm font-medium mb-1">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaLock className="text-gray-400" />
            </div>
            <motion.input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter your password"
              required
              whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.2)" }}
            />
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <motion.button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-lg focus:outline-none disabled:opacity-50 transition-all duration-200"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            {loading ? (
              <motion.div
                className="flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <svg 
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  ></circle>
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </motion.div>
            ) : (
              isLogin ? 'Login' : 'Sign Up'
            )}
          </motion.button>
        </motion.div>

        <motion.div 
          className="relative my-6"
          variants={itemVariants}
        >
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          <motion.button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            <FaGoogle className="text-red-500" />
            <span>Google</span>
          </motion.button>

          <motion.button
            type="button"
            onClick={handleGithubLogin}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            <FaGithub className="text-gray-800" />
            <span>GitHub</span>
          </motion.button>
        </div>
      </motion.form>

      <motion.div
        className="mt-6 text-center text-gray-600"
        variants={itemVariants}
      >
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <motion.button
          onClick={toggleMode}
          className="text-indigo-600 hover:text-indigo-800 font-medium"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isLogin ? 'Sign up' : 'Login'}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

export default LoginForm;