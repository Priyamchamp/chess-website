import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { FaChess, FaSignOutAlt } from 'react-icons/fa';

function Navbar() {
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <nav className="bg-white shadow-lg fixed top-0 left-0 right-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <FaChess className="text-2xl text-blue-600" />
            <span className="font-bold text-xl text-gray-800">CheckmateX</span>
          </Link>
          
          {currentUser && (
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                {currentUser.email}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-gray-600 hover:text-red-500 transition-colors"
              >
                <FaSignOutAlt />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;