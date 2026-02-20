'use server';

/**
 * @fileOverview Moderates user-generated content for contact details, abuse, and spam.
 *
 * - moderateMessageContent - A function that handles the content moderation process.
 * - ModerateMessageContentInput - The input type for the moderateMessageContent function.
 * - ModerateMessageContentOutput - The return type for the moderateMessageContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ModerateMessageContentInputSchema = z.object({
  message: z
    .string()
    .describe('The message content to be moderated.'),
});
export type ModerateMessageContentInput = z.infer<typeof ModerateMessageContentInputSchema>;

const ModerateMessageContentOutputSchema = z.object({
  modifiedMessage: z
    .string()
    .describe('The message with any inappropriate content redacted.'),
  modificationReason: z
    .string()
    .optional()
    .describe(
      'The reason the message was modified, if any. This will be shown to the sender.'
    ),
});
export type ModerateMessageContentOutput = z.infer<typeof ModerateMessageContentOutputSchema>;

export async function moderateMessageContent(input: ModerateMessageContentInput): Promise<ModerateMessageContentOutput> {
  return moderateMessageContentFlow(input);
}

const moderateMessageContentPrompt = ai.definePrompt({
  name: 'moderateMessageContentPrompt',
  input: {schema: ModerateMessageContentInputSchema},
  output: {schema: ModerateMessageContentOutputSchema},
  prompt: `You are a highly vigilant content moderation AI for a B2B marketplace. Your primary role is to prevent users from sharing prohibited content. You must be very strict.

Analyze the user's message for any of the following violations:
1.  **Contact Information:** Any form of contact information, including but not limited to email addresses, phone numbers, website URLs, or social media handles. Users may try to disguise this information (e.g., "user at domain dot com", "9 8 8 - 4 6 7 six one one nine").
2.  **Abusive or Hateful Content:** Any language that is profane, hateful, harassing, threatening, or otherwise inappropriate for a professional business environment.
3.  **Spam or Unsolicited Advertising:** Messages that are clearly spam, irrelevant advertising, or gibberish.

Your task is to:
1. If the message contains any prohibited content, you must redact it. Replace the entire piece of offending information with a neutral placeholder like "[contact information removed]" or "[inappropriate content removed]".
2. After redacting, populate the 'modifiedMessage' field with the safe version of the message.
3. Populate 'modificationReason' with a brief, user-friendly explanation of why the message was modified (e.g., "A potential phone number was removed from your message.").
4. If the message contains absolutely no prohibited content, the 'modifiedMessage' should be identical to the original message, and 'modificationReason' should be empty.

Original Message: {{{message}}}`,
});

const moderateMessageContentFlow = ai.defineFlow(
  {
    name: 'moderateMessageContentFlow',
    inputSchema: ModerateMessageContentInputSchema,
    outputSchema: ModerateMessageContentOutputSchema,
  },
  async input => {
    const {output} = await moderateMessageContentPrompt(input);
    return output!;
  }
);
