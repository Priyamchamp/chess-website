import { useState } from 'react';
import { FaChess, FaGithub, FaGoogle } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: ''
  });
  const [loading, setLoading] = useState(false);
  
  const { signup, login, loginWithGithub, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success('Successfully logged in!');
        navigate('/');
      } else {
        await signup(formData.email, formData.password);
        toast.success('Account created successfully!');
        navigate('/');
      }
    } catch (error) {
      let errorMessage = 'An error occurred during authentication';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters';
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage = 'Invalid email or password';
          break;
      }
      
      toast.error(errorMessage);
    }

    setLoading(false);
  };

  const handleGithubLogin = async () => {
    try {
      setLoading(true);
      toast.loading('Initiating GitHub login...', { id: 'github-login' });
      
      await loginWithGithub();
      
      toast.success('Successfully logged in with GitHub!', { id: 'github-login' });
      navigate('/');
    } catch (error) {
      let errorMessage = 'Failed to login with GitHub';
      
      switch (error.code) {
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'An account already exists with this email';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Popup was blocked. Redirecting to GitHub login...';
          toast.loading(errorMessage, { id: 'github-login' });
          return;
        case 'auth/cancelled-popup-request':
          errorMessage = 'Login cancelled';
          break;
        case 'auth/popup-closed-by-user':
          errorMessage = 'Login window was closed';
          break;
      }
      
      toast.error(errorMessage, { id: 'github-login' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      toast.loading('Initiating Google login...', { id: 'google-login' });
      
      await loginWithGoogle();
      
      toast.success('Successfully logged in with Google!', { id: 'google-login' });
      navigate('/');
    } catch (error) {
      let errorMessage = 'Failed to login with Google';
      
      switch (error.code) {
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'An account already exists with this email';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Popup was blocked. Redirecting to Google login...';
          toast.loading(errorMessage, { id: 'google-login' });
          return;
        case 'auth/cancelled-popup-request':
          errorMessage = 'Login cancelled';
          break;
        case 'auth/popup-closed-by-user':
          errorMessage = 'Login window was closed';
          break;
      }
      
      toast.error(errorMessage, { id: 'google-login' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-2xl p-8">
        <Toaster position="top-center" />
        
        <div className="text-center mb-8">
          <FaChess className="text-5xl text-blue-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-800">
            {isLogin ? 'Welcome Back!' : 'Create Account'}
          </h2>
          <p className="text-gray-600 mt-2">
            {isLogin ? 'Login to access your games' : 'Join our chess community'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Enter your username"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <FaGoogle className="text-red-500 mr-2" />
              Continue with Google
            </button>
            <button
              onClick={handleGithubLogin}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <FaGithub className="text-gray-800 mr-2" />
              Continue with GitHub
            </button>
          </div>
        </div>

        <p className="text-center mt-8 text-gray-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:underline font-medium"
          >
            {isLogin ? 'Sign up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default AuthPage;