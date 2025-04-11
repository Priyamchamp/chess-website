import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  arrayUnion, 
  serverTimestamp, 
  getDocs 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Firebase configuration 
const firebaseConfig = {
  apiKey: "AIzaSyD5-3BW4SlJAKRZ-XZ_Y7jAKQUQK2JbU1E",
  authDomain: "checkmatex-14b32.firebaseapp.com",
  projectId: "checkmatex-14b32",
  storageBucket: "checkmatex-14b32.appspot.com",
  messagingSenderId: "565847647848",
  appId: "1:565847647848:web:326b3ce87cbe8fc7daea0c"
};

// Initialize Firebase app (or get existing one to prevent duplicate initialization)
let app;
try {
  // Check if Firebase app already exists
  if (getApps().length === 0) {
    // No Firebase app exists, initialize a new one
    app = initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
  } else {
    // Firebase app already exists, get the existing one
    app = getApp();
    console.log('Using existing Firebase app');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  // If there's an error with duplicate app, get the existing one
  if (error.code === 'app/duplicate-app') {
    app = getApp();
    console.log('Recovered from duplicate app error');
  } else {
    throw error;
  }
}

// Get Firebase services
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const database = getDatabase(app);

// Firestore collections
export const usersCollection = collection(firestore, 'users');
export const matchesCollection = collection(firestore, 'matches');
export const matchmakingQueue = collection(firestore, 'matchmaking_queue');

// Enable offline persistence for Firestore if browser supports it
// Commented out to avoid permissions issues
/*
try {
  firestore.enablePersistence?.({ synchronizeTabs: true })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence could not be enabled: multiple tabs open');
      } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence is not available in this browser');
      }
    });
} catch (err) {
  console.warn('Error enabling persistence:', err);
}
*/

// Helper functions for Firebase operations
export const createDocument = (collectionRef, data) => addDoc(collectionRef, data);
export const getDocument = (collectionRef, id) => getDoc(doc(collectionRef, id));
export const updateDocument = (collectionRef, id, data) => updateDoc(doc(collectionRef, id), data);
export const deleteDocument = (collectionRef, id) => deleteDoc(doc(collectionRef, id));

// Export ALL Firestore functions directly to avoid import errors
export { 
  addDoc,
  arrayUnion, 
  collection,
  deleteDoc,
  doc, 
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
};

// Export Firebase instance with services
const firebase = {
  app,
  auth,
  firestore,
  database,
  // Include Firestore operations in the default export
  addDocument: createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  // Include all Firestore functions in the default export
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
};

export default firebase; 