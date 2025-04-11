import { db } from '../config/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// Collection name for user profiles
const USERS_COLLECTION = 'users';

/**
 * Creates or updates a user profile in Firestore
 * @param {string} uid - The user's ID from Firebase Auth
 * @param {object} profileData - The profile data to save
 * @returns {Promise} - A promise that resolves when the profile is saved
 */
export const saveUserProfile = async (uid, profileData) => {
  // Return early if no uid or profileData
  if (!uid || !profileData) {
    console.error('Missing user ID or profile data');
    return false;
  }
  
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);
    
    // Clean up the profile data to ensure no undefined values
    const cleanedProfileData = Object.entries(profileData).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});
    
    if (userSnap.exists()) {
      // Update existing profile
      await updateDoc(userRef, cleanedProfileData);
    } else {
      // Create new profile
      await setDoc(userRef, {
        ...cleanedProfileData,
        createdAt: new Date(),
      });
    }
    return true;
  } catch (error) {
    console.error('Error saving user profile:', error);
    // Don't throw the error, handle it gracefully
    return false;
  }
};

/**
 * Retrieves a user profile from Firestore with retry logic
 * @param {string} uid - The user's ID from Firebase Auth
 * @returns {Promise<object|null>} - The user profile or null if not found
 */
export const getUserProfile = async (uid) => {
  // Return early if no uid
  if (!uid) {
    console.error('getUserProfile: Missing user ID');
    return null;
  }
  
  const MAX_RETRIES = 3;
  let lastError = null;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`getUserProfile: Attempting to fetch profile for user ${uid} (attempt ${attempt + 1}/${MAX_RETRIES})`);
      
      const userRef = doc(db, USERS_COLLECTION, uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        console.log(`getUserProfile: Successfully fetched profile for user ${uid}`);
        return { id: userSnap.id, ...userSnap.data() };
      }
      
      console.log(`getUserProfile: No profile found for user ${uid}`);
      return null;
    } catch (error) {
      console.error(`getUserProfile: Error on attempt ${attempt + 1}/${MAX_RETRIES}:`, error);
      lastError = error;
      
      // Check if it's a recoverable error (like a network issue)
      const isRecoverable = 
        error.code === 'failed-precondition' || 
        error.code === 'unavailable' || 
        error.code === 'resource-exhausted' ||
        error.message?.includes('offline') ||
        error.message?.includes('network');
      
      if (!isRecoverable) {
        console.error('getUserProfile: Non-recoverable error, breaking retry loop');
        break;
      }
      
      // Exponential backoff
      const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000);
      console.log(`getUserProfile: Retrying after ${delayMs}ms delay`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  console.error('getUserProfile: All retries failed:', lastError);
  return null;
};

/**
 * Updates the gaming name for a user
 * @param {string} uid - The user's ID from Firebase Auth
 * @param {string} gamingName - The new gaming name
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const updateGamingName = async (uid, gamingName) => {
  // Return early if no uid or gamingName
  if (!uid || !gamingName) {
    console.error('Missing user ID or gaming name');
    return false;
  }
  
  try {
    await saveUserProfile(uid, { gamingName });
    return true;
  } catch (error) {
    console.error('Error updating gaming name:', error);
    return false;
  }
}; 