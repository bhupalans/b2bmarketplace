
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { User } from '@/lib/types';
import { startOfDay, addDays, differenceInDays } from 'date-fns';
import { sendSubscriptionReminderEmail } from '@/services/email';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * This function is intended to be run by a scheduled job (e.g., a cron job via Cloud Scheduler) once per day.
 * It checks for users whose subscriptions are expiring and sends them a reminder email at appropriate intervals.
 */
export async function sendSubscriptionReminders() {
  console.log('Starting daily subscription reminder check...');
  let totalEmailsSent = 0;

  const today = new Date();
  const thirtyDaysFromNow = addDays(today, 30);

  // Define the reminder tiers in days.
  const reminderTiers = [1, 3, 7, 15, 30];

  try {
    // Query for all users whose subscriptions expire between now and the next 30 days.
    // This uses proper Timestamp objects for comparison.
    const expiringSoonQuery = adminDb.collection('users')
      .where('subscriptionExpiryDate', '>', Timestamp.fromDate(today))
      .where('subscriptionExpiryDate', '<=', Timestamp.fromDate(thirtyDaysFromNow))
      .where('renewalCancelled', '!=', true);

    const snapshot = await expiringSoonQuery.get();

    if (snapshot.empty) {
      console.log('No users with upcoming subscription expirations found.');
      return { success: true, message: `Processed reminders. Sent 0 emails.` };
    }

    console.log(`Found ${snapshot.size} user(s) with subscriptions expiring soon.`);
    
    for (const doc of snapshot.docs) {
      const user = { id: doc.id, ...doc.data() } as User & { lastReminderSent?: string };
      
      if (!user.email || !user.subscriptionExpiryDate) {
          continue;
      }
      
      const expiryDate = new Date(user.subscriptionExpiryDate);
      const daysRemaining = differenceInDays(expiryDate, today);

      // Determine the correct reminder tier.
      let applicableTier: number | null = null;
      for (const tier of reminderTiers) {
        if (daysRemaining < tier) {
          applicableTier = tier;
          break;
        }
      }

      if (applicableTier === null && daysRemaining > 0) {
        // Handle the case for exactly 30 days
        if (daysRemaining <= 30) applicableTier = 30;
      }

      if (applicableTier === null) {
          continue;
      }
      
      const lastReminderDate = user.lastReminderSent ? new Date(user.lastReminderSent) : null;

      // Check if a reminder was already sent today.
      if (lastReminderDate && differenceInDays(today, lastReminderDate) < 1) {
          console.log(`Skipping email for ${user.email}, reminder already sent recently.`);
          continue;
      }
      
      // Check if a reminder for this specific tier has already been sent
      if (user.lastReminderTier && user.lastReminderTier <= applicableTier) {
          console.log(`Skipping email for ${user.email}, tier ${applicableTier} reminder already sent.`);
          continue;
      }

      console.log(`Sending ${applicableTier}-day reminder to ${user.email} (expires in ${daysRemaining} days).`);
      
      await sendSubscriptionReminderEmail({ user, daysRemaining });
      
      await doc.ref.update({ 
          lastReminderSent: new Date().toISOString(),
          lastReminderTier: applicableTier,
      });
      
      totalEmailsSent++;
    }

    console.log(`Subscription reminder check finished. Total emails sent: ${totalEmailsSent}.`);
    return { success: true, message: `Processed reminders. Sent ${totalEmailsSent} emails.` };
    
  } catch (error) {
    console.error("Error during subscription reminder processing:", error);
    return { success: false, error: 'An error occurred while processing reminders.' };
  }
}
