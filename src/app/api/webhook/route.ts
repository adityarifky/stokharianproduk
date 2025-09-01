
'use server';
import { NextResponse, type NextRequest } from "next/server";
import { ai } from "@/ai/genkit";
import { getAllProducts } from "../stock/route";
import type { Product } from "@/lib/types";

const findProductPrompt = ai.definePrompt({
    name: 'findProductPrompt',
    prompt: `You are an expert assistant for a pastry shop called Dreampuff.
Your task is to find the exact product name from the user's message.

Here is the list of all available products:
{{ productList }}

Here is the user's message:
"{{ userMessage }}"

Based on the list and the message, what is the single most likely product the user is asking for?
If a matching product is found, respond with only the exact product name.
If no likely product is found, respond with the word "UNKNOWN".`,
});


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const userMessage = body.message;

        if (!userMessage || typeof userMessage !== 'string') {
            return NextResponse.json({ error: "Invalid request body. 'message' field is required." }, { status: 400 });
        }
        
        // 1. Fetch all products to give context to the AI
        const allProducts = await getAllProducts();
        if (allProducts.length === 0) {
            return NextResponse.json({ reply: "Maaf, belum ada produk yang terdaftar saat ini." }, { status: 200 });
        }

        const productNames = allProducts.map(p => p.name).join(', ');
        
        // 2. Ask the AI to find the product name
        const { output } = await findProductPrompt({
            productList: productNames,
            userMessage: userMessage,
        });

        const foundProductName = output;

        if (!foundProductName || foundProductName.trim().toUpperCase() === 'UNKNOWN') {
            return NextResponse.json({ reply: `Maaf, aku nggak ngerti produk apa yang kamu maksud. Coba sebutin nama produknya lebih spesifik ya.` }, { status: 200 });
        }

        // 3. Find the full product details from the name
        const foundProduct = allProducts.find(p => p.name.toLowerCase() === foundProductName.trim().toLowerCase());

        if (!foundProduct) {
             return NextResponse.json({ reply: `Maaf, aku nggak nemu produk namanya "${foundProductName}". Mungkin salah ketik?` }, { status: 200 });
        }
        
        // 4. Formulate the response
        const replyText = `Stok untuk ${foundProduct.name} sisa ${foundProduct.stock} ya, bro!`;

        return NextResponse.json({ reply: replyText, product: foundProduct }, { status: 200 });

    } catch (error: any) {
        console.error("Error in webhook processing:", error);
        return NextResponse.json({ error: `An internal error occurred: ${error.message}` }, { status: 500 });
    }
}
