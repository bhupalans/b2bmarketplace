'use server';
/**
 * @fileOverview A support chatbot flow that answers user questions based on a static knowledge base.
 *
 * - answerQuestion - A function that takes a user's question and returns an answer.
 * - AnswerQuestionInput - The input type for the function.
 * - AnswerQuestionOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnswerQuestionInputSchema = z.object({
  question: z.string().describe('The user\'s question.'),
});
export type AnswerQuestionInput = z.infer<typeof AnswerQuestionInputSchema>;

const AnswerQuestionOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer.'),
});
export type AnswerQuestionOutput = z.infer<typeof AnswerQuestionOutputSchema>;

export async function answerQuestion(
  input: AnswerQuestionInput
): Promise<AnswerQuestionOutput> {
  return answerQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'supportChatbotPrompt',
  input: { schema: AnswerQuestionInputSchema },
  output: { schema: AnswerQuestionOutputSchema },
  prompt: `You are a friendly and professional support agent for a B2B marketplace.
Your goal is to answer user questions based *only* on the information provided in the KNOWLEDGE BASE below.
Do not make up information. If the user's question cannot be answered using the knowledge base, politely state that you cannot help with that specific topic. Keep your answers concise and helpful.

--- KNOWLEDGE BASE ---

**Platform Role:**
The marketplace is a neutral platform connecting business-to-business buyers and sellers. We do not handle shipping, guarantee product quality, or process payments for the actual goods. All transactions are at the users' own risk.

**Shipping Policy:**
All shipping and logistics are arranged and managed directly between the buyer and the seller. Each seller is responsible for defining their own shipping policy. Buyers are responsible for reviewing a seller's policy before purchase and for handling any import duties or taxes.

**Subscription Fees & Refunds:**
Yearly subscription plans are for a fixed one-year term and are paid via a one-time fee. All subscription fees paid to the platform are final and non-refundable.

**Subscription Renewal & Cancellation:**
Subscriptions do not automatically renew. Your premium access will expire at the end of your paid term. No cancellation is necessary.

**Transactions Between Users:**
Each Seller is responsible for their own policy for order cancellations, returns, and refunds for the goods they sell. Buyers must read the seller's specific policies. All disputes regarding goods must be resolved directly between the Buyer and the Seller.

**Account Verification:**
A "Verified" status means a user has completed our document submission process. It is not an endorsement or guarantee of the user's credibility. Users should still perform their own due diligence.

**Prohibited Conduct:**
Users are strictly prohibited from sharing direct contact information (email, phone numbers, websites) in public listings or initial messages to circumvent the platform's communication system.

--- END KNOWLEDGE BASE ---

Based on the knowledge base, please answer the following user question.

User Question: {{{question}}}`,
});

const answerQuestionFlow = ai.defineFlow(
  {
    name: 'answerQuestionFlow',
    inputSchema: AnswerQuestionInputSchema,
    outputSchema: AnswerQuestionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
