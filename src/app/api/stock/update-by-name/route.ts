'use server';

import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/server";
import type { Product } from "@/lib/types";

// Fungsi untuk otentikasi request dari n8n
const authenticateRequest = (req: NextRequest) => {
    const serverApiKey = process.env.N8N_API_KEY;
    if (!serverApiKey) {
        console.error("Authentication failed: N8N_API_KEY environment variable is not set.");
        return false;
    }
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return false;
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return false;
    return parts[1] === serverApiKey;
}

interface StockUpdateByName {
    name: string;
    stock: number;
}

// Handler untuk method POST
export async function POST(req: NextRequest) {
    // 1. Otentikasi request
    if (!authenticateRequest(req)) {
        return NextResponse.json({ message: 'Unauthorized: Invalid or missing API Key.' }, { status: 401 });
    }
    
    // 2. Pastikan database terinisialisasi
    if (!adminDb) {
      console.error("Firestore Admin is not initialized.");
      return NextResponse.json({ message: 'Internal Server Error: Firebase configuration error.' }, { status: 500 });
    }

    try {
        // 3. Ambil data dari body request
        const update: StockUpdateByName = await req.json();
        
        if (!update || typeof update.name !== 'string' || typeof update.stock !== 'number') {
            throw new Error("Invalid payload format. Expected { name: string, stock: number }.");
        }

        // 4. Cari produk berdasarkan nama (case-insensitive)
        const productsQuery = adminDb.collection("products");
        const productSnapshot = await productsQuery.get();
        
        let foundProduct: (Product & { id: string }) | null = null;
        for (const doc of productSnapshot.docs) {
            const product = doc.data() as Product;
            if (product.name.toLowerCase() === update.name.toLowerCase()) {
                foundProduct = { id: doc.id, ...product };
                break;
            }
        }

        // 5. Jika produk tidak ditemukan, kembalikan error 404
        if (!foundProduct) {
            return NextResponse.json({ message: `Product with name "${update.name}" not found.` }, { status: 404 });
        }

        // 6. Jika ditemukan, update stoknya menggunakan ID produk
        const productRef = adminDb.collection("products").doc(foundProduct.id);
        await productRef.update({ stock: update.stock });

        // 7. Kembalikan respons sukses
        return NextResponse.json({ message: `Stock for "${foundProduct.name}" (ID: ${foundProduct.id}) updated successfully to ${update.stock}.` }, { status: 200 });

    } catch (error: any) {
        console.error("Error in POST /api/stock/update-by-name:", error);
        return NextResponse.json({ message: `Bad Request: ${error.message}` }, { status: 400 });
    }
}
