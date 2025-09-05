
/**
 * @fileOverview Berkas ini berisi definisi tipe dan skema Zod untuk flow AI.
 * Memisahkan skema ke dalam berkas tersendiri mencegah error build Next.js
 * yang terkait dengan directive "use server".
 */

import { z } from 'zod';

const ProductStockSchema = z.object({
  name: z.string().describe('The name of the product.'),
  stock: z.number().describe('The available stock quantity.'),
});

export const CreateResponseInputSchema = z.object({
  type: z.enum(['category', 'product', 'not_found', 'error', 'unknown'])
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
