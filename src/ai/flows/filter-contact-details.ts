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
  prompt: `You are a content moderation AI for a B2B marketplace. Your role is to prevent users from sharing contact information like email addresses, phone numbers, or website URLs in messages.

Analyze the user's message. 
- If it contains any contact details, you must redact them. Replace the contact detail with a neutral placeholder like "[contact information removed]".
- After redacting, populate the 'modifiedMessage' field with the safe version of the message.
- Populate 'modificationReason' with a brief, user-friendly explanation of what was removed (e.g., "An email address was removed from your message.").
- If the message contains no contact details, the 'modifiedMessage' should be identical to the original message, and 'modificationReason' should be empty.

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
