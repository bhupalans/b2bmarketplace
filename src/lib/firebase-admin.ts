
import admin from 'firebase-admin';

// This file is used to initialize the Firebase Admin SDK on the server.
// It should only be imported in server-side code (e.g., server actions, API routes).

const appName = 'firebase-admin-app-b2b-marketplace';

function getAdminApp() {
  // Check if the app is already initialized
  if (admin.apps.some((app) => app?.name === appName)) {
    return admin.app(appName);
  }

  // If not initialized, create a new app instance.
  // When running on Google Cloud (like App Hosting), the SDK automatically
  // finds the service account credentials. No need to pass them manually.
  return admin.initializeApp(
    {
      // The storageBucket is required for Storage operations.
      storageBucket: 'b2b-marketplace-udg1v.appspot.com',
    },
    appName
  );
}

export { getAdminApp };
