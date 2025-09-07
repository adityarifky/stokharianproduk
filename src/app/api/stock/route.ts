
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/server";
import type { Product } from "@/lib/types";

// --- PENTING: Menonaktifkan Caching di Vercel ---
// Baris ini memberitahu Vercel untuk tidak menyimpan cache dari respons API ini.
// Ini memastikan data yang dikirim selalu yang paling baru (real-time) dari Firestore.
export const revalidate = 0;

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

export async function GET(req: NextRequest) {
    if (!authenticateRequest(req)) {
        return NextResponse.json({ message: 'Unauthorized: Invalid or missing API Key.' }, { status: 401 });
    }

    if (!adminDb) {
      console.error("Firestore Admin is not initialized. Check server environment variables.");
      return NextResponse.json({ message: 'Internal Server Error: Firebase configuration error.' }, { status: 500 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const nameQuery = searchParams.get('name')?.toLowerCase();
        const categoryQuery = searchParams.get('category')?.toLowerCase();
        
        const productsQuery = adminDb.collection("products");
        const productSnapshot = await productsQuery.get();
        
        let allProducts: Product[] = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));

        // Terapkan filter jika ada query
        if (nameQuery || categoryQuery) {
            allProducts = allProducts.filter(p => {
                const productName = p.name.toLowerCase();
                const productCategory = p.category.toLowerCase();
                
                // Jika ada query nama, produk harus cocok dengan nama
                const nameMatch = nameQuery ? productName.includes(nameQuery) : true;
                
                // Jika ada query kategori, produk harus cocok dengan kategori
                const categoryMatch = categoryQuery ? productCategory.includes(categoryQuery) : true;

                // Kembalikan produk jika cocok dengan kedua kondisi (jika ada)
                return nameMatch && categoryMatch;
            });
        }
        
        return NextResponse.json(allProducts, { 
            status: 200,
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        });

    } catch (error: any) {
        console.error("Error in GET /api/stock:", error);
        return NextResponse.json({ message: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}

interface StockUpdate {
    id: string;
    stock: number;
}

export async function POST(req: NextRequest) {
    if (!authenticateRequest(req)) {
        return NextResponse.json({ message: 'Unauthorized: Invalid or missing API Key.' }, { status: 401 });
    }
    
    if (!adminDb) {
      console.error("Firestore Admin is not initialized.");
      return NextResponse.json({ message: 'Internal Server Error: Firebase configuration error.' }, { status: 500 });
    }

    let updates: StockUpdate[];
    try {
        const body = await req.json();
        updates = body.updates;
        if (!Array.isArray(updates) || updates.some(u => typeof u.id !== 'string' || typeof u.stock !== 'number')) {
            throw new Error("Invalid payload format.");
        }
    } catch (error: any) {
        return NextResponse.json({ message: `Bad Request: ${error.message}` }, { status: 400 });
    }

    try {
        const batch = adminDb.batch();
        updates.forEach(update => {
            const productRef = adminDb.collection("products").doc(update.id);
            batch.update(productRef, { stock: update.stock });
        });
        await batch.commit();

        return NextResponse.json({ message: "Stock updated successfully." }, { status: 200 });

    } catch (error: any) {
        console.error("Error in POST /api/stock:", error);
        return NextResponse.json({ message: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}
