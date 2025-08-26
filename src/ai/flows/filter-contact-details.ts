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
  containsContactDetails: z
    .boolean()
    .describe('Whether the message contains any contact details.'),
  flaggedReason: z
    .string()
    .optional()
    .describe('The reason the message was flagged, if any.'),
});
export type FilterContactDetailsOutput = z.infer<typeof FilterContactDetailsOutputSchema>;

export async function filterContactDetails(input: FilterContactDetailsInput): Promise<FilterContactDetailsOutput> {
  return filterContactDetailsFlow(input);
}

const filterContactDetailsPrompt = ai.definePrompt({
  name: 'filterContactDetailsPrompt',
  input: {schema: FilterContactDetailsInputSchema},
  output: {schema: FilterContactDetailsOutputSchema},
  prompt: `You are a content moderation AI that scans messages for contact details.

  Your job is to analyze the message and determine if it contains any contact details, like phone numbers, email addresses, or website links.

  If the message contains contact details, set containsContactDetails to true and provide a reason in flaggedReason.
  If not, set containsContactDetails to false, and leave flaggedReason empty.

  Message: {{{message}}}`,
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
