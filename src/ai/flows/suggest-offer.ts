'use server';

/**
 * @fileOverview Suggests offer details based on chat history.
 *
 * - suggestOffer - A function that suggests offer details.
 * - SuggestOfferInput - The input type for the suggestOffer function.
 * - SuggestOfferOutput - The return type for the suggestOffer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestOfferInputSchema = z.object({
  chatHistory: z.string().describe('The recent conversation history between the buyer and seller.'),
  availableProducts: z.array(z.object({
    id: z.string(),
    title: z.string(),
    priceUSD: z.number(),
  })).describe("A list of products the seller has available to sell."),
});
export type SuggestOfferInput = z.infer<typeof SuggestOfferInputSchema>;

const SuggestOfferOutputSchema = z.object({
  productId: z.string().optional().describe('The ID of the product being discussed.'),
  quantity: z.number().optional().describe('The quantity of the product the buyer is interested in.'),
  pricePerUnit: z.number().optional().describe('The price per unit discussed, if any.'),
});
export type SuggestOfferOutput = z.infer<typeof SuggestOfferOutputSchema>;

export async function suggestOffer(input: SuggestOfferInput): Promise<SuggestOfferOutput> {
  return suggestOfferFlow(input);
}

const suggestOfferPrompt = ai.definePrompt({
  name: 'suggestOfferPrompt',
  input: {schema: SuggestOfferInputSchema},
  output: {schema: SuggestOfferOutputSchema},
  prompt: `You are an intelligent assistant for a seller on a B2B marketplace. Your task is to analyze a chat conversation and a list of available products to suggest the details for a formal offer.

  Analyze the conversation provided in 'chatHistory'. Your goal is to determine which product the buyer is interested in, the quantity they desire, and any price they may have mentioned or negotiated.

  Here is the list of products the seller has available:
  {{#each availableProducts}}
  - Product ID: {{{id}}}, Title: "{{{title}}}", Standard Price: {{{priceUSD}}}
  {{/each}}

  Based on your analysis of the chat history, you must:
  1. Identify the single product the buyer is asking about and find its corresponding 'productId' from the list above. The product title in the chat might be a partial match or a variation of the title in the list.
  2. Extract the 'quantity' the buyer is requesting.
  3. Extract the 'pricePerUnit' if a specific price has been discussed or negotiated. If no price is mentioned, you can suggest the standard price for that product.
  4. Populate the 'productId', 'quantity', and 'pricePerUnit' fields in the output. If you cannot determine a value for a field, leave it empty.

  Chat History:
  {{{chatHistory}}}
  `,
});


const suggestOfferFlow = ai.defineFlow(
  {
    name: 'suggestOfferFlow',
    inputSchema: SuggestOfferInputSchema,
    outputSchema: SuggestOfferOutputSchema,
  },
  async input => {
    const {output} = await suggestOfferPrompt(input);
    return output!;
  }
);
