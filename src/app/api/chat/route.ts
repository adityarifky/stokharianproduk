import { NextRequest, NextResponse } from "next/server";
import { type MessageData } from "genkit";
import { conversationalChat } from "@/ai/flows/chat-flow";
import { adminDb } from "@/lib/firebase/server";
import type { Product } from "@/lib/types";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Fungsi untuk mengambil semua produk dari Firestore
async function getAllProducts(): Promise<Product[]> {
  if (!adminDb) {
    console.error("Firestore Admin is not initialized.");
    return [];
  }
  try {
    const productsSnapshot = await adminDb.collection("products").get();
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

    if (!history || !Array.isArray(history)) {
      return NextResponse.json(
        { error: "Invalid request body. 'history' must be an array of messages." },
        { status: 400 }
      );
    }
    
    // 1. Ambil daftar produk terbaru dari Firestore
    const productList = await getAllProducts();

    // 2. Sertakan history dan productList saat memanggil flow AI
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
