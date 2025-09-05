
'use server';
/**
 * @fileOverview A flow to generate a human-like response based on stock data.
 *
 * - createResponseMessage - A function that handles the response generation.
 * - CreateResponseInput - The input type for the createResponseMessage function.
 * - CreateResponseOutput - The return type for the createResponseMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const ProductStockSchema = z.object({
  name: z.string().describe('The name of the product.'),
  stock: z.number().describe('The available stock quantity.'),
});

export const CreateResponseInputSchema = z.object({
  type: z.enum(['category', 'product', 'not_found', 'error'])
    .describe('The type of information being presented.'),
  entityName: z.string().describe('The name of the category or product being asked about.'),
  products: z.array(ProductStockSchema)
    .describe('An array of products and their stock. Will be empty for "not_found" or "error" types.'),
});
export type CreateResponseInput = z.infer<typeof CreateResponseInputSchema>;

export const CreateResponseOutputSchema = z.object({
  response: z.string().describe('The generated, human-like, and friendly response text.'),
});
export type CreateResponseOutput = z.infer<typeof CreateResponseOutputSchema>;


export async function createResponseMessage(input: CreateResponseInput): Promise<CreateResponseOutput> {
  return createResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createResponsePrompt',
  input: {schema: CreateResponseInputSchema},
  output: {schema: CreateResponseOutputSchema},
  prompt: `You are a friendly and casual shop assistant chatbot for "Dreampuff". 
Your task is to create a short, friendly, and natural-sounding response in Indonesian based on the structured data you receive.
Your responses should be for internal team members, so keep it casual like talking to a friend.
Vary your phrasing and tone slightly each time to sound more human.

Here is the data for your response:
- The user was asking about: {{entityName}}
- The type of request was: {{type}}
- Here are the relevant products and their stock:
{{#each products}}
  - {{name}}: {{stock}}
{{/each}}

Based on the data, generate the "response" field.

Here are some examples of the tone you should aim for:

- If type is 'category': "Oke, bro! Ini stok buat kategori {{entityName}}: [list products]. Jangan lupa di-update kalo ada yang laku, ya!"
- If type is 'product' and stock is > 0: "Aman, bro! Stok {{entityName}} sisa {{products.[0].stock}} biji."
- If type is 'product' and stock is 0: "Yah, stok {{entityName}} lagi kosong nih, bro."
- If type is 'not_found': "Waduh, {{entityName}} kayaknya salah tulis atau emang gak ada, bro. Coba cek lagi namanya."

Now, create a new, unique response based on the provided input data.
`,
});


const createResponseFlow = ai.defineFlow(
  {
    name: 'createResponseFlow',
    inputSchema: CreateResponseInputSchema,
    outputSchema: CreateResponseOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
