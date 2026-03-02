import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// This file initializes the Firebase Admin SDK for server-side use only.

const appName = 'firebase-admin-app-b2b-marketplace';
const storageBucket =
  process.env.FIREBASE_STORAGE_BUCKET ||
  "vbuysell-dev.firebasestorage.app";
const localServiceAccountPath = path.join(
  process.cwd(),
  'secrets',
  'vbuysell-dev.json'
);

function getAdminCredential(): admin.credential.Credential {
  // Prefer project-local service account for local development.
  if (fs.existsSync(localServiceAccountPath)) {
    try {
      const raw = fs.readFileSync(localServiceAccountPath, 'utf8');
      const parsed = JSON.parse(raw) as admin.ServiceAccount;
      return admin.credential.cert(parsed);
    } catch (error) {
      console.warn(
        `Failed to load local Firebase service account from ${localServiceAccountPath}. Falling back to application default credentials.`,
        error
      );
    }
  }

  // Fallback for hosted/runtime environments.
  return admin.credential.applicationDefault();
}

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
      credential: getAdminCredential(),
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
