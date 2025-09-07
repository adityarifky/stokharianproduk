'use server';
/**
 * @fileOverview A conversational flow that uses Genkit's built-in memory.
 *
 * - chat - A function that continues a conversation.
 * - ChatInput - The input type for the chat function.
 * - ChatOutput - The return type for the chat function.
 */

import {ai} from '@/ai/genkit';
import {run} from 'genkit/experimental';
import {z} from 'zod';
import {
  retrieveMostRecentMessages,
  saveMessages,
} from 'genkit/experimental/memory';

const ChatInputSchema = z.object({
  history: z.array(z.any()).optional(),
  message: z.string(),
  sessionId: z.string(),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.string();
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

// This is the main prompt for our chatbot.
const chatPrompt = ai.definePrompt(
  {
    name: 'chatPrompt',
    input: {schema: z.object({history: z.array(z.any()), message: z.string()})},
    // Note: We are not using an output schema here so the model can respond more freely.
    // In a production app, you would want to add a schema to ensure the model
    // responds in the format you expect.
    // output: {schema: ChatOutputSchema},

    // This is the system prompt that guides the model's behavior.
    system: `Anda adalah "Dreambot", sebuah AI yang super canggih, ramah, dan informatif dengan gaya bahasa santai seperti teman ngobrol sehari-hari. Anda tidak kaku dan selalu berusaha memberikan jawaban yang relevan dan berguna, baik itu soal data internal toko kue Dreampuff ataupun pengetahuan umum.

# PERATURAN UTAMA
1.  **AKURASI ADALAH SEGALANYA:** Saat menyajikan data dari sistem, Anda DILARANG KERAS mengubah, menambah, atau menginterpretasi data tersebut. Tampilkan apa adanya. Jika data kosong, katakan kosong.
2.  **GUNAKAN BAHASA SANTAI:** Panggil pengguna "bro" atau sapaan akrab lainnya.
3.  **JAWAB PENGETAHUAN UMUM:** Gunakan pengetahuan umummu untuk menjawab pertanyaan di luar data toko.
4.  **MEMORI PERCAKAPAN:** Anda akan menerima riwayat percakapan. Gunakan itu untuk memahami konteks dan memberikan respons yang nyambung. Jangan menjawab seolah-olah ini adalah percakapan pertama.

# CONTOH SKENARIO DENGAN MEMORI
- Jika sebelumnya Anda memberikan daftar stok yang kosong, dan user merespons "waduh kosong semua ya", jawaban Anda harusnya nyambung, seperti: "Iya, bro, lagi pada kosong nih. Mungkin lagi proses restock. Mau aku cek lagi nanti?"
- JANGAN menjawab: "Aduh, kenapa bro? kalau ada apa-apa, cerita aja ya." karena itu menunjukkan Anda tidak ingat percakapan sebelumnya.
`,
    prompt: `Berikut adalah riwayat percakapan. Lanjutkan.

{{#each history}}
  {{#if (eq role 'user')}}
    User: {{{content.[0].text}}}
  {{else}}
    You: {{{content.[0].text}}}
  {{/if}}
{{/each}}

User: {{{message}}}
You:`,
  },
  run
);

// This is the flow that orchestrates the chat.
const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    // Save the user's message to memory.
    await saveMessages(input.sessionId, [
      {role: 'user', content: [{text: input.message}]},
    ]);

    // Retrieve the most recent messages from memory.
    const history = await retrieveMostRecentMessages(input.sessionId, 10);

    // Run the chat prompt with the history and new message.
    const llmResponse = await chatPrompt({
      history,
      message: input.message,
    });
    const response = llmResponse.output || 'Maaf bro, lagi nge-blank nih.';

    // Save the model's response to memory.
    await saveMessages(input.sessionId, [
      {role: 'model', content: [{text: response}]},
    ]);

    return response;
  }
);

// This is the exported function that will be called by the API route.
export async function chat(input: ChatInput) {
  return await chatFlow(input);
}
