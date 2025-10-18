
import admin from 'firebase-admin';

// This file is used to initialize the Firebase Admin SDK on the server.
// It should only be imported in server-side code (e.g., server actions, API routes).

const appName = 'firebase-admin-app-b2b-marketplace';

// This function ensures the Firebase Admin app is initialized only once.
function getAdminApp() {
  // Check if the app is already initialized to prevent errors.
  if (admin.apps.some((app) => app?.name === appName)) {
    return admin.app(appName);
  }

  // If not initialized, create a new app instance.
  // Explicitly setting the project ID and storage bucket makes initialization more robust,
  // especially in serverless environments where environment variable inference can fail.
  return admin.initializeApp(
    {
      projectId: "b2b-marketplace-udg1v",
      storageBucket: "b2b-marketplace-udg1v.appspot.com",
    },
    appName
  );
}

const adminApp = getAdminApp();
const adminAuth = adminApp.auth();
const adminStorage = adminApp.storage();
const adminDb = adminApp.firestore();

export { adminApp, adminAuth, adminStorage, adminDb };
