import { NextResponse } from 'next/server';
import { sendSubscriptionReminders } from '@/app/cron-actions';

// This function can be called by a cloud scheduler to trigger the daily cron job.
export async function POST(request: Request) {
  try {
    // In a production environment, you would want to secure this endpoint.
    // For example, by checking a secret header passed by the Cloud Scheduler job.
    // App Hosting's IAM integration provides a strong baseline of security by default.
    console.log("Cron job started via /api/cron endpoint.");
    const result = await sendSubscriptionReminders();
    console.log("Cron job finished.", result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Cron job failed via /api/cron endpoint:", error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
