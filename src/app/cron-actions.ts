'use server';

import { adminDb } from '@/lib/firebase-admin';
import { User } from '@/lib/types';
import { startOfDay, endOfDay, addDays } from 'date-fns';
import { sendSubscriptionReminderEmail } from '@/services/email';

/**
 * This function is intended to be run by a scheduled job (e.g., a cron job via Cloud Scheduler) once per day.
 * It checks for users whose subscriptions are expiring in 30, 15, 7, or 1 day(s) and sends them a reminder email.
 */
export async function sendSubscriptionReminders() {
  console.log('Starting daily subscription reminder check...');

  const reminderDays = [30, 15, 7, 1]; // Days before expiration to send a reminder
  const today = new Date();
  let totalEmailsSent = 0;

  for (const days of reminderDays) {
    const targetDate = addDays(today, days);
    const startOfTargetDay = startOfDay(targetDate).toISOString();
    const endOfTargetDay = endOfDay(targetDate).toISOString();

    try {
      const expiringUsersQuery = adminDb.collection('users')
        .where('subscriptionExpiryDate', '>=', startOfTargetDay)
        .where('subscriptionExpiryDate', '<=', endOfTargetDay)
        .where('renewalCancelled', '!=', true); // Don't notify users who have cancelled

      const snapshot = await expiringUsersQuery.get();

      if (snapshot.empty) {
        console.log(`No users found with subscriptions expiring in ${days} days.`);
        continue;
      }

      console.log(`Found ${snapshot.size} user(s) with subscriptions expiring in ${days} days.`);

      for (const doc of snapshot.docs) {
        const user = { id: doc.id, ...doc.data() } as User;
        if (user.email) {
          await sendSubscriptionReminderEmail({ user, daysRemaining: days });
          totalEmailsSent++;
        }
      }
    } catch (error) {
      console.error(`Error processing reminders for ${days}-day expiration:`, error);
    }
  }

  console.log(`Subscription reminder check finished. Total emails sent: ${totalEmailsSent}.`);
  return { success: true, message: `Processed reminders. Sent ${totalEmailsSent} emails.` };
}