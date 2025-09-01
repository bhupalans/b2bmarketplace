'use server';

/**
 * @fileOverview Filters contact details (phone numbers, emails, links) from messages exchanged between buyers and sellers.
 *
 * - filterContactDetails - A function that handles the contact detail filtering process.
 * - FilterContactDetailsInput - The input type for the filterContactDetails function.
 * - FilterContactDetailsOutput - The return type for the filterContactDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FilterContactDetailsInputSchema = z.object({
  message: z
    .string()
    .describe('The message content to be checked for contact details.'),
});
export type FilterContactDetailsInput = z.infer<typeof FilterContactDetailsInputSchema>;

const FilterContactDetailsOutputSchema = z.object({
  modifiedMessage: z
    .string()
    .describe('The message with any contact details redacted.'),
  modificationReason: z
    .string()
    .optional()
    .describe(
      'The reason the message was modified, if any. This will be shown to the sender.'
    ),
});
export type FilterContactDetailsOutput = z.infer<typeof FilterContactDetailsOutputSchema>;

export async function filterContactDetails(input: FilterContactDetailsInput): Promise<FilterContactDetailsOutput> {
  return filterContactDetailsFlow(input);
}

const filterContactDetailsPrompt = ai.definePrompt({
  name: 'filterContactDetailsPrompt',
  input: {schema: FilterContactDetailsInputSchema},
  output: {schema: FilterContactDetailsOutputSchema},
  prompt: `You are a highly vigilant content moderation AI for a B2B marketplace. Your primary role is to prevent users from sharing any form of contact information, including but not limited to email addresses, phone numbers, website URLs, or social media handles. Users may try to disguise this information, so you must be very strict.

Analyze the user's message for any attempts to share contact information, even if it is obfuscated. Pay close attention to:
- **Disguised Phone Numbers:** Look for sequences of numbers separated by spaces, symbols, or words (e.g., "my number is 9 8 8 - 4 6 7 six one one nine" or "9+8+8*4/6 7 6 I I 9").
- **Disguised Emails:** Look for patterns like "user at domain dot com" or "user @ domain . com".
- **Disguised URLs:** Look for website names without the "http" or ".com", or with spaces inserted (e.g., "visit my site at mybusinesspage").

Your task is to:
1. If the message contains any potential contact details (clear or disguised), you must redact them. Replace the entire piece of contact information with a neutral placeholder like "[contact information removed]".
2. After redacting, populate the 'modifiedMessage' field with the safe version of the message.
3. Populate 'modificationReason' with a brief, user-friendly explanation of why the message was modified (e.g., "A potential phone number was removed from your message.").
4. If the message contains absolutely no contact details, the 'modifiedMessage' should be identical to the original message, and 'modificationReason' should be empty.

Original Message: {{{message}}}`,
});

const filterContactDetailsFlow = ai.defineFlow(
  {
    name: 'filterContactDetailsFlow',
    inputSchema: FilterContactDetailsInputSchema,
    outputSchema: FilterContactDetailsOutputSchema,
  },
  async input => {
    const {output} = await filterContactDetailsPrompt(input);
    return output!;
  }
);
