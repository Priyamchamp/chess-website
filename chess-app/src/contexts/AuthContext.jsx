import { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GithubAuthProvider,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth, provider as googleProvider } from '../config/firebase';
import { getUserProfile, saveUserProfile, updateGamingName } from '../services/userService';

const AuthContext = createContext(null);

export const useAuth = () => {
  return useContext(AuthContext);
};

function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserProfile = async (user) => {
    if (!user) return null;
    
    try {
      const profile = await getUserProfile(user.uid);
      if (profile) {
        setUserProfile(profile);
      }
      return profile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Don't crash if profile fetch fails
      setError('Failed to fetch user profile');
      return null;
    }
  };

  useEffect(() => {
    let unsubscribe = () => {};
    
    try {
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        if (user) {
          try {
            await fetchUserProfile(user);
          } catch (profileError) {
            console.error('Error in profile fetch:', profileError);
            // Continue with auth but without profile
          }
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      });
    } catch (authError) {
      console.error('Auth state listener error:', authError);
      setLoading(false);
      setError('Authentication service unavailable');
    }

    return unsubscribe;
  }, []);

  const signup = async (email, password, gamingName) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile with gaming name
      if (result.user && gamingName) {
        try {
          await saveUserProfile(result.user.uid, { 
            email: result.user.email,
            gamingName,
            displayName: result.user.displayName || gamingName
          });
          
          // Also update the displayName in Firebase Auth
          await updateProfile(result.user, {
            displayName: gamingName
          });
        } catch (profileError) {
          console.error('Error saving profile during signup:', profileError);
          // Continue with auth even if profile save fails
        }
      }
      
      return result;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const setGamingName = async (gamingName) => {
    if (!currentUser) throw new Error('No user logged in');
    
    try {
      // Update gaming name in Firestore
      const profileUpdated = await updateGamingName(currentUser.uid, gamingName);
      
      // Update display name in Firebase Auth
      await updateProfile(currentUser, {
        displayName: gamingName
      });
      
      // Refresh the current user to get updated displayName
      setCurrentUser({ ...currentUser });
      
      // Update user profile in state if profile was successfully updated
      let updatedProfile = null;
      if (profileUpdated) {
        updatedProfile = await fetchUserProfile(currentUser);
      }
      return updatedProfile;
    } catch (error) {
      console.error('Error setting gaming name:', error);
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      console.log('AuthContext: Attempting login for email:', email);
      
      if (!email || !password) {
        const error = new Error('Email and password are required');
        error.code = 'auth/missing-credentials';
        throw error;
      }
      
      // Clear any previous errors
      setError(null);
      
      // Attempt to sign in
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // If successful, fetch user profile
      if (result.user) {
        console.log('AuthContext: Login successful for user:', result.user.uid);
        await fetchUserProfile(result.user);
      }
      
      return result;
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      
      // Set the error in the context
      setError(error.message || 'Failed to sign in');
      
      // Rethrow for the component to handle
      throw error;
    }
  };

  const loginWithGithub = async () => {
    const githubProvider = new GithubAuthProvider();
    return signInWithPopup(auth, githubProvider);
  };

  const loginWithGoogle = async () => {
    try {
      console.log('AuthContext: Attempting Google login');
      
      // Clear any previous errors
      setError(null);
      
      // Attempt to sign in with Google
      const result = await signInWithPopup(auth, googleProvider);
      
      // If successful, fetch user profile
      if (result.user) {
        console.log('AuthContext: Google login successful for user:', result.user.uid);
        await fetchUserProfile(result.user);
      }
      
      return result;
    } catch (error) {
      console.error('AuthContext: Google login error:', error);
      
      // Set the error in the context
      setError(error.message || 'Failed to sign in with Google');
      
      // Rethrow for the component to handle
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Clear user profile state first
      setUserProfile(null);
      // Then sign out from Firebase
      await signOut(auth);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    error,
    signup,
    login,
    loginWithGithub,
    loginWithGoogle,
    logout,
    setGamingName,
    fetchUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export { AuthProvider };