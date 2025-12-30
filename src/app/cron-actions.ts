
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { User } from '@/lib/types';
import { startOfDay, addDays, differenceInDays } from 'date-fns';
import { sendSubscriptionReminderEmail } from '@/services/email';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getUsersByIds } from '@/lib/database';

/**
 * This function sends reminders to a specific list of users.
 * It is designed to be triggered manually from an admin interface.
 */
export async function sendSubscriptionReminders(userIds: string[]) {
  if (!userIds || userIds.length === 0) {
      return { success: false, error: "No user IDs provided."};
  }
  
  console.log(`Starting manual subscription reminder for ${userIds.length} user(s)...`);
  let totalEmailsSent = 0;
  
  const today = new Date();

  // Define the reminder tiers in days. A reminder is sent if the expiry is within this many days.
  const reminderTiers = [1, 3, 7, 15, 30];

  try {
    const userMap = await getUsersByIds(userIds);
    
    for (const userId of userIds) {
        const user = userMap.get(userId);
        
        if (!user || !user.email || !user.subscriptionExpiryDate) {
          console.log(`Skipping user ${userId}: missing data.`);
          continue;
        }
        
        const expiryDate = new Date(user.subscriptionExpiryDate as string);
        if (expiryDate < today) {
            console.log(`Skipping user ${userId}: subscription already expired.`);
            continue;
        }

        const daysRemaining = differenceInDays(expiryDate, today);

        // Find the most appropriate (smallest) tier the user falls into.
        let applicableTier: number | null = null;
        for (const tier of reminderTiers) {
            if (daysRemaining <= tier) {
                applicableTier = tier;
                break;
            }
        }
        
        if (applicableTier === null) {
            console.log(`Skipping user ${userId}: not within any reminder tier (days left: ${daysRemaining}).`);
            continue;
        }

        const lastReminderDate = user.lastReminderSent ? new Date(user.lastReminderSent) : null;

        // Prevent sending more than one reminder per day to the same user.
        if (lastReminderDate && differenceInDays(today, lastReminderDate) < 1) {
            console.log(`Skipping user ${userId}: reminder already sent recently.`);
            continue;
        }

        console.log(`Sending ${applicableTier}-day reminder to ${user.email} (expires in ${daysRemaining} days).`);
      
        await sendSubscriptionReminderEmail({ user, daysRemaining });
        
        // Update the user document to log that a reminder was sent.
        await adminDb.collection('users').doc(userId).update({ 
            lastReminderSent: new Date().toISOString(),
            lastReminderTier: applicableTier,
        });
        
        totalEmailsSent++;
    }

    console.log(`Manual reminder process finished. Total emails sent: ${totalEmailsSent}.`);
    return { success: true, message: `Processed reminders. Sent ${totalEmailsSent} emails.` };
    
  } catch (error) {
    console.error("Error during manual subscription reminder processing:", error);
    return { success: false, error: 'An error occurred while processing reminders.' };
  }
}
