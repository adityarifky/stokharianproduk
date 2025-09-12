
import { NextRequest, NextResponse } from "next/server";
import { type MessageData } from "genkit";
import { conversationalChat } from "@/ai/flows/chat-flow";
import { adminDb } from "@/lib/firebase/server";
import type { Product } from "@/lib/types";

export const dynamic = 'force-dynamic';
// Set a longer timeout for AI operations
export const maxDuration = 60; 
export const revalidate = 0;

// Function to fetch all products from Firestore
async function getAllProducts(): Promise<Product[]> {
  if (!adminDb) {
    console.error("Firestore Admin is not initialized.");
    return [];
  }
  try {
    const productsSnapshot = await adminDb.collection("products").orderBy("name").get();
    if (productsSnapshot.empty) {
      return [];
    }
    return productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  } catch (error) {
    console.error("Error fetching all products:", error);
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const history: MessageData[] = body.history;

    if (!history || !Array.isArray(history) || history.length === 0) {
      return NextResponse.json(
        { error: "Invalid request body. 'history' must be a non-empty array of messages." },
        { status: 400 }
      );
    }
    
    // 1. Automatically fetch the latest product list from Firestore.
    const productList = await getAllProducts();

    if (productList.length === 0) {
      // Return a specific error if no products are found, so the AI can respond appropriately.
      console.warn("No products found in the database.");
    }

    // 2. Include history and productList when calling the AI flow.
    const answer = await conversationalChat({ history, productList });

    return NextResponse.json({ answer });

  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    return NextResponse.json(
      {
        error: "An internal server error occurred.",
        details: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
