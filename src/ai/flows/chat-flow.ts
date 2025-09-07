
'use server';
/**
 * @fileOverview A conversational flow that uses Genkit's built-in memory.
 *
 * - chat - A function that continues a conversation.
 * - ChatInput - The input type for the chat function.
 * - ChatOutput - The return type for the chat function.
 */

import {ai} from '@/ai/genkit';
import {generate} from 'genkit/ai';
import type {Message} from 'genkit/ai';
import {
  history,
  defineConversation,
} from 'genkit/context';
import {z} from 'zod';

const ChatInputSchema = z.object({
  history: z.array(z.any()).optional(),
  message: z.string(),
  sessionId: z.string(),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.string();
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

// This is the main prompt for our chatbot.
const chatPrompt = `Anda adalah "Dreambot", sebuah AI yang super canggih, ramah, dan informatif dengan gaya bahasa santai seperti teman ngobrol sehari-hari. Anda tidak kaku dan selalu berusaha memberikan jawaban yang relevan dan berguna, baik itu soal data internal toko kue Dreampuff ataupun pengetahuan umum.

# PERATURAN UTAMA
1.  **AKURASI ADALAH SEGALANYA:** Saat menyajikan data dari sistem, Anda DILARANG KERAS mengubah, menambah, atau menginterpretasi data tersebut. Tampilkan apa adanya. Jika data kosong, katakan kosong.
2.  **GUNAKAN BAHASA SANTAI:** Panggil pengguna "bro" atau sapaan akrab lainnya.
3.  **JAWAB PENGETAHUAN UMUM:** Gunakan pengetahuan umummu untuk menjawab pertanyaan di luar data toko.
4.  **MEMORI PERCAKAPAN:** Anda akan menerima riwayat percakapan. Gunakan itu untuk memahami konteks dan memberikan respons yang nyambung. Jangan menjawab seolah-olah ini adalah percakapan pertama.

# CONTOH SKENARIO DENGAN MEMORI
- Jika sebelumnya Anda memberikan daftar stok yang kosong, dan user merespons "waduh kosong semua ya", jawaban Anda harusnya nyambung, seperti: "Iya, bro, lagi pada kosong nih. Mungkin lagi proses restock. Mau aku cek lagi nanti?"
- JANGAN menjawab: "Aduh, kenapa bro? kalau ada apa-apa, cerita aja ya." karena itu menunjukkan Anda tidak ingat percakapan sebelumnya.
`;

// This is the flow that orchestrates the chat.
const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    // Start a new conversation session with memory.
    // This will automatically save new messages and retrieve history.
    return defineConversation(
      {
        conversationId: input.sessionId,
        prompt: chatPrompt,
      },
      async () => {
        // The history is automatically retrieved by defineConversation.
        // We just need to generate the next response.
        const llmResponse = await generate({
          model: 'gemini-2.0-flash',
          prompt: input.message, // Send only the new message
          history: await history(), // The history is managed by the session
        });

        return llmResponse.text;
      }
    );
  }
);

// This is the exported function that will be called by the API route.
export async function chat(input: ChatInput) {
  return await chatFlow(input);
}
