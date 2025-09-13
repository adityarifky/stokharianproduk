
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/server";
import type { Product, SaleHistoryItem } from "@/lib/types";
import { FieldValue, writeBatch } from "firebase-admin/firestore";

// --- PENTING: Menonaktifkan Caching di Vercel ---
// Baris ini memberitahu Vercel untuk tidak menyimpan cache dari respons API ini.
// Ini memastikan data yang dikirim selalu yang paling baru (real-time) dari Firestore.
export const revalidate = 0;

const authenticateRequest = (req: NextRequest) => {
    // Diperbarui: Mengambil API Key dari environment variables
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
        const nameQuery = searchParams.get('name')?.toLowerCase().trim();
        const categoryQuery = searchParams.get('category')?.toLowerCase().trim();
        
        const productsQuery = adminDb.collection("products").orderBy("name");
        const productSnapshot = await productsQuery.get();
        
        let allProducts: Product[] = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));

        // --- Logika Pencarian Diperbaiki ---
        // Logika pencarian dibuat lebih spesifik untuk mencegah ambiguitas
        let filteredProducts: Product[] = allProducts;

        if (categoryQuery) {
            filteredProducts = allProducts.filter(p => p.category.toLowerCase() === categoryQuery);
        } else if (nameQuery) {
            filteredProducts = allProducts.filter(p => p.name.toLowerCase().includes(nameQuery));
        }
        
        return NextResponse.json(filteredProducts, { 
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
    id?: string;
    name?: string;
    stock?: number; // Nilai absolut (opsional)
    change?: number; // Nilai perubahan (misal: +5 atau -2)
    session?: { // Info sesi dari bot, opsional
      name: string;
      position: string;
    }
}

export async function POST(req: NextRequest) {
    if (!authenticateRequest(req)) {
        return NextResponse.json({ message: 'Unauthorized: Invalid or missing API Key.' }, { status: 401 });
    }
    
    if (!adminDb) {
      console.error("Firestore Admin is not initialized.");
      return NextResponse.json({ message: 'Internal Server Error: Firebase configuration error.' }, { status: 500 });
    }

    try {
        const update: StockUpdate = await req.json();
        
        // Validasi: Harus ada 'id' atau 'name', dan salah satu dari 'stock' atau 'change'
        if ((!update.id && !update.name) || (typeof update.stock !== 'number' && typeof update.change !== 'number')) {
             return NextResponse.json({ message: 'Bad Request: "id" or "name" is required, and either "stock" (absolute) or "change" (relative) must be provided.' }, { status: 400 });
        }

        let productId: string | undefined = update.id;
        
        // Jika hanya nama yang diberikan, cari ID-nya
        if (update.name && !productId) {
            const productSnapshot = await adminDb.collection("products").where("name", "==", update.name).limit(1).get();
            if (!productSnapshot.empty) {
                productId = productSnapshot.docs[0].id;
            } else {
                return NextResponse.json({ message: `Product with name "${update.name}" not found.` }, { status: 404 });
            }
        }

        if (!productId) {
            return NextResponse.json({ message: 'Bad Request: Product ID could not be determined.' }, { status: 400 });
        }

        const productRef = adminDb.collection("products").doc(productId);
        const productDoc = await productRef.get();
        if (!productDoc.exists) {
            return NextResponse.json({ message: `Product with ID "${productId}" not found.` }, { status: 404 });
        }
        const productData = productDoc.data() as Product;

        let stockChange = 0;
        let newStock = 0;

        if (typeof update.change === 'number') {
            stockChange = update.change;
            newStock = productData.stock + stockChange;
        } else if (typeof update.stock === 'number') {
            stockChange = update.stock - productData.stock;
            newStock = update.stock;
        }

        // Mulai batch write untuk operasi atomik
        const batch = adminDb.batch();

        // 1. Update stok produk
        batch.update(productRef, { stock: newStock });

        // 2. Buat catatan riwayat berdasarkan jenis perubahan
        // Gunakan info sesi dari body jika ada, jika tidak, gunakan default
        const sessionInfo = update.session || { name: "Bot Telegram", position: "Sistem" }; 

        if (stockChange > 0) { // Penambahan Stok
            const historyRef = adminDb.collection("stock_history").doc();
            batch.set(historyRef, {
                timestamp: FieldValue.serverTimestamp(),
                session: sessionInfo,
                product: {
                    id: productData.id,
                    name: productData.name,
                    image: productData.image,
                },
                quantityAdded: stockChange,
                stockAfter: newStock,
            });
        } else if (stockChange < 0) { // Pengurangan Stok (Penjualan)
            const historyRef = adminDb.collection("sales_history").doc();
            const saleItem: SaleHistoryItem = {
                productId: productData.id,
                productName: productData.name,
                quantity: Math.abs(stockChange),
                image: productData.image
            };
            batch.set(historyRef, {
                timestamp: FieldValue.serverTimestamp(),
                session: sessionInfo,
                items: [saleItem],
                totalItems: Math.abs(stockChange),
            });
        }

        // Commit semua operasi sekaligus
        await batch.commit();

        return NextResponse.json({ message: `Stock for product ${productId} updated successfully and history recorded.` }, { status: 200 });

    } catch (error: any) {
        console.error("Error in POST /api/stock:", error);
        return NextResponse.json({ message: `Bad Request: ${error.message}` }, { status: 400 });
    }
}


interface NewProduct {
    name: string;
    category: "Creampuff" | "Cheesecake" | "Millecrepes" | "Minuman" | "Snackbox" | "Lainnya";
}

export async function PUT(req: NextRequest) {
    if (!authenticateRequest(req)) {
        return NextResponse.json({ message: 'Unauthorized: Invalid or missing API Key.' }, { status: 401 });
    }

    if (!adminDb) {
      console.error("Firestore Admin is not initialized.");
      return NextResponse.json({ message: 'Internal Server Error: Firebase configuration error.' }, { status: 500 });
    }

    try {
        const body = await req.json() as NewProduct;
        if (!body.name || !body.category) {
            return NextResponse.json({ message: 'Bad Request: "name" and "category" are required.' }, { status: 400 });
        }

        const newProductRef = adminDb.collection("products").doc();
        const newProduct = {
            id: newProductRef.id,
            name: body.name,
            category: body.category,
            stock: 0,
            image: "https://placehold.co/600x400.png",
        };

        await newProductRef.set(newProduct);
        
        return NextResponse.json({ message: `Product "${body.name}" created successfully.`, product: newProduct }, { status: 201 });

    } catch (error: any) {
        console.error("Error in PUT /api/stock:", error);
        return NextResponse.json({ message: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}

interface DeleteProduct {
    id: string;
}

export async function DELETE(req: NextRequest) {
    if (!authenticateRequest(req)) {
        return NextResponse.json({ message: 'Unauthorized: Invalid or missing API Key.' }, { status: 401 });
    }
    
    if (!adminDb) {
      console.error("Firestore Admin is not initialized.");
      return NextResponse.json({ message: 'Internal Server Error: Firebase configuration error.' }, { status: 500 });
    }

    try {
        const body = await req.json() as DeleteProduct;
        if (!body.id) {
            return NextResponse.json({ message: 'Bad Request: "id" is required.' }, { status: 400 });
        }

        const productRef = adminDb.collection("products").doc(body.id);
        const doc = await productRef.get();

        if (!doc.exists) {
            return NextResponse.json({ message: 'Product not found.' }, { status: 404 });
        }
        
        await productRef.delete();

        return NextResponse.json({ message: `Product with ID "${body.id}" deleted successfully.` }, { status: 200 });

    } catch (error: any) {
        console.error("Error in DELETE /api/stock:", error);
        return NextResponse.json({ message: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}


    