import admin from 'firebase-admin';

// This file initializes the Firebase Admin SDK for server-side use only.

const appName = 'firebase-admin-app-b2b-marketplace';
const storageBucket =
  process.env.FIREBASE_STORAGE_BUCKET ||
  "vbuysell-dev.firebasestorage.app";

function getAdminApp() {
  // Reuse the app if already initialized
  const existingApp = admin.apps.find(app => app.name === appName);
  if (existingApp) {
    return existingApp;
  }

  // Initialize using application default credentials.
  // The project is inferred from the service account JSON
  // pointed to by GOOGLE_APPLICATION_CREDENTIALS.
  return admin.initializeApp(
    {
      credential: admin.credential.applicationDefault(),
      storageBucket,
    },
    appName
  );
}

const adminApp = getAdminApp();

const adminAuth = adminApp.auth();
const adminStorage = adminApp.storage();
const adminDb = adminApp.firestore();

export { adminApp, adminAuth, adminStorage, adminDb };
