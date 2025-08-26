
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'b2b-marketplace-udg1v',
  appId: '1:822558435203:web:c462791316c4540a2e78b6',
  storageBucket: 'b2b-marketplace-udg1v.firebasestorage.app',
  apiKey: 'AIzaSyDL_o5j6RtqjCwFN5iTtvUj6nFfyDJaaxc',
  authDomain: 'b2b-marketplace-udg1v.firebaseapp.com',
  messagingSenderId: '822558435203',
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Dynamically set the authDomain to the current host for multi-domain support
// This is crucial for Google Sign-In to work from different environments (like Cloud Workstations)
if (typeof window !== 'undefined') {
  auth.tenantId = window.location.hostname;
}

export { app, auth, db };
