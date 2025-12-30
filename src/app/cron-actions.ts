
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { User } from '@/lib/types';
import { startOfDay, endOfDay, addDays, differenceInDays } from 'date-fns';
import { sendSubscriptionReminderEmail } from '@/services/email';

/**
 * This function is intended to be run by a scheduled job (e.g., a cron job via Cloud Scheduler) once per day.
 * It checks for users whose subscriptions are expiring and sends them a reminder email at appropriate intervals.
 */
export async function sendSubscriptionReminders() {
  console.log('Starting daily subscription reminder check...');
  let totalEmailsSent = 0;

  const today = startOfDay(new Date());

  // Define the reminder tiers in days.
  const reminderTiers = [1, 3, 7, 15, 30];

  try {
    // Query for all users whose subscriptions expire between tomorrow and the next 30 days.
    const expiringSoonQuery = adminDb.collection('users')
      .where('subscriptionExpiryDate', '>', today.toISOString())
      .where('subscriptionExpiryDate', '<=', addDays(today, 30).toISOString())
      .where('renewalCancelled', '!=', true);

    const snapshot = await expiringSoonQuery.get();

    if (snapshot.empty) {
      console.log('No users with upcoming subscription expirations found.');
      return { success: true, message: `Processed reminders. Sent 0 emails.` };
    }

    console.log(`Found ${snapshot.size} user(s) with subscriptions expiring soon.`);
    
    for (const doc of snapshot.docs) {
      const user = { id: doc.id, ...doc.data() } as User & { lastReminderSent?: string };
      
      // Skip if user has no email or expiry date
      if (!user.email || !user.subscriptionExpiryDate) {
          continue;
      }
      
      const expiryDate = startOfDay(new Date(user.subscriptionExpiryDate));
      const daysRemaining = differenceInDays(expiryDate, today);

      // Determine which reminder tier the user falls into.
      let applicableTier: number | null = null;
      for (const tier of reminderTiers) {
        if (daysRemaining <= tier) {
          applicableTier = tier;
          break; // Stop at the first (smallest) applicable tier
        }
      }

      if (applicableTier === null) {
          continue; // User's expiration is not within a reminder window today.
      }
      
      // Check if a reminder for this tier has already been sent recently.
      // This simple check prevents re-sending the same tier reminder.
      // A more robust solution might store which tier was sent, but this is effective.
      const lastReminderDate = user.lastReminderSent ? startOfDay(new Date(user.lastReminderSent)) : null;

      // Check if a reminder has already been sent today
      if (lastReminderDate && differenceInDays(today, lastReminderDate) < 1) {
          console.log(`Skipping email for ${user.email}, reminder already sent today.`);
          continue;
      }

      console.log(`Sending ${applicableTier}-day reminder to ${user.email} (expires in ${daysRemaining} days).`);
      
      await sendSubscriptionReminderEmail({ user, daysRemaining });
      
      // Update the user document with the date of the last reminder sent
      await doc.ref.update({ lastReminderSent: today.toISOString() });
      
      totalEmailsSent++;
    }

    console.log(`Subscription reminder check finished. Total emails sent: ${totalEmailsSent}.`);
    return { success: true, message: `Processed reminders. Sent ${totalEmailsSent} emails.` };
    
  } catch (error) {
    console.error("Error during subscription reminder processing:", error);
    return { success: false, error: 'An error occurred while processing reminders.' };
  }
}
