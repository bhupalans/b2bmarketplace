
'use server';

import { getAdminApp } from '@/lib/firebase-admin';
import { getStorage } from 'firebase-admin/storage';

// This is a server-only action that uses the Firebase Admin SDK.
// It is called by other server actions, not directly by the client.
export async function uploadFileToStorage(
  fileBuffer: Buffer,
  filePath: string,
  contentType: string
): Promise<string> {
  try {
    const app = getAdminApp(); // Ensure the admin app is initialized
    const storage = getStorage(app);
    const bucket = storage.bucket('b2b-marketplace-udg1v.appspot.com');
    const file = bucket.file(filePath);

    await file.save(fileBuffer, {
      metadata: {
        contentType: contentType,
      },
    });

    // Make the file public and get the URL
    await file.makePublic();
    
    return file.publicUrl();
  } catch (error: any) {
    console.error('Error uploading file with Admin SDK:', error);
    // Throw a new error to be caught by the calling server action
    throw new Error(`Firebase Admin SDK Error: ${error.message}`);
  }
}
