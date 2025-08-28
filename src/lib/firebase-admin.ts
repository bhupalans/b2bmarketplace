
import admin from 'firebase-admin';

// This file is used to initialize the Firebase Admin SDK on the server.
// It should only be imported in server-side code (e.g., server actions, API routes).

const appName = 'firebase-admin-app-b2b-marketplace';

function getAdminApp() {
  // Check if the app is already initialized
  if (admin.apps.some((app) => app?.name === appName)) {
    return admin.app(appName);
  }

  // When running on Google Cloud (like App Hosting), the SDK can automatically
  // find the service account credentials. We initialize with the application
  // default credentials which App Hosting provides.
  return admin.initializeApp(
    {
      credential: admin.credential.applicationDefault(),
      // The storageBucket is required for Storage operations.
      storageBucket: 'b2b-marketplace-udg1v.appspot.com',
    },
    appName
  );
}

const adminAuth = getAdminApp().auth();

export { getAdminApp, adminAuth };
