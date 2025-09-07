
'use server';
/**
 * @fileOverview A conversational chat flow for Dreampuff stock bot.
 *
 * - chat - A function that handles the conversation, including history.
 * - ChatInput - The input type for the chat function.
 * - ChatOutput - The return type for the chat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ChatInputSchema = z.object({
  history: z.string().optional().describe('The conversation history between the user and the assistant.'),
  message: z.string().describe('The latest message from the user.'),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  reply: z.string().describe('The AI assistant\'s response.'),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

export async function chat(input: ChatInput): Promise<ChatOutput> {
  return chatFlow(input);
}

const systemPrompt = `You are a friendly and helpful assistant for "Dreampuff", a pastry shop.
Your name is PuffBot. You should be helpful, friendly, and use casual Indonesian language ("bro", "sist", "santai aja", etc.).
Your primary function is to check daily product stock.
If the user asks about stock, you should assume they are asking about today's stock.
Keep your answers concise and to the point.

If the stock is 0, say it's "habis" (sold out).
If the stock is low (1-5), mention that it's "tinggal sedikit" (only a few left).

Conversation History is provided below, use it to understand the context of the user's message.
Do not repeat information you have already given unless asked.
If you don't know the answer, just say "Waduh, aku kurang tau bro, coba tanya yang lain ya."
`;

const prompt = ai.definePrompt({
  name: 'chatPrompt',
  input: { schema: ChatInputSchema },
  output: { schema: ChatOutputSchema },
  system: systemPrompt,
  prompt: `{{#if history}}
Riwayat Percakapan:
{{{history}}}
{{/if}}

Pesan Baru Pengguna:
{{{message}}}

Balasanmu:`,
});

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
