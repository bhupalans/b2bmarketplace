
import admin from 'firebase-admin';

// This file is used to initialize the Firebase Admin SDK on the server.
// It should only be imported in server-side code (e.g., server actions, API routes).

const appName = 'firebase-admin-app-b2b-marketplace';

function getAdminApp() {
  // Check if the app is already initialized
  if (admin.apps.some((app) => app?.name === appName)) {
    return admin.app(appName);
  }

  // Explicitly setting the project ID and storage bucket makes initialization more robust.
  return admin.initializeApp(
    {
      credential: admin.credential.applicationDefault(),
      projectId: 'b2b-marketplace-udg1v',
      storageBucket: 'b2b-marketplace-udg1v.appspot.com',
    },
    appName
  );
}

const adminAuth = getAdminApp().auth();

export { getAdminApp, adminAuth };
