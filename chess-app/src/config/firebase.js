import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA0IVYr_O8oNh8gW0LMTe09j63YYi6iXJM",
  authDomain: "checkmatex-14b32.firebaseapp.com",
  projectId: "checkmatex-14b32",
  storageBucket: "checkmatex-14b32.appspot.com",
  messagingSenderId: "124492354076",
  appId: "1:124492354076:web:f4eb0aa00db0ed3db905d9",
  measurementId: "G-BD173W8Q95"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const provider = new GoogleAuthProvider();
const auth = getAuth(app);

// Initialize Firestore with minimalist configuration for maximum compatibility
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
  cacheSizeBytes: 10485760 // 10MB cache size (smaller to avoid memory issues)
});

export { auth, provider, db };
export default app;
