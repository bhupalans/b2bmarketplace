'use server';
/**
 * @fileOverview A flow for enhancing a product description using AI.
 *
 * - enhanceProductDescription - A function that rewrites a product description.
 * - EnhanceProductDescriptionInput - The input type for the function.
 * - EnhanceProductDescriptionOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const EnhanceProductDescriptionInputSchema = z.object({
  title: z.string().describe('The title of the product.'),
  description: z.string().describe('The current description of the product.'),
});
export type EnhanceProductDescriptionInput = z.infer<
  typeof EnhanceProductDescriptionInputSchema
>;

const EnhanceProductDescriptionOutputSchema = z.object({
  enhancedDescription: z
    .string()
    .describe('The new, enhanced product description.'),
});
export type EnhanceProductDescriptionOutput = z.infer<
  typeof EnhanceProductDescriptionOutputSchema
>;

export async function enhanceProductDescription(
  input: EnhanceProductDescriptionInput
): Promise<EnhanceProductDescriptionOutput> {
  return enhanceProductDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'enhanceProductDescriptionPrompt',
  input: { schema: EnhanceProductDescriptionInputSchema },
  output: { schema: EnhanceProductDescriptionOutputSchema },
  prompt: `You are an expert B2B copywriter tasked with improving a product listing for a global marketplace.
Your goal is to make the description more professional, detailed, and appealing to business buyers.

Rewrite and expand the following product description.
- Use a professional and clear tone.
- Structure the description with clear headings (e.g., Key Features, Applications, Specifications).
- Highlight the key features and benefits for a business customer.
- Do not invent technical specifications that are not present in the original description.
- The output should be a single block of text, using newline characters for spacing.

Product Title: {{{title}}}
Original Description: {{{description}}}`,
});

const enhanceProductDescriptionFlow = ai.defineFlow(
  {
    name: 'enhanceProductDescriptionFlow',
    inputSchema: EnhanceProductDescriptionInputSchema,
    outputSchema: EnhanceProductDescriptionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
