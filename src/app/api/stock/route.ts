
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
    productId?: string;
    id?: string; // Alias untuk productId dari n8n
    name?: string;
    stock?: number; // Nilai absolut
    amount?: number; // Nilai perubahan (relatif)
    change?: number; // Alias untuk amount dari n8n
    natural_response?: string; // Menangkap respon natural dari AI
    session?: {
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
        
        // --- UPGRADE: Logika input yang fleksibel ---
        const productId = update.productId || update.id;
        const amount = update.amount ?? update.change; // Gunakan amount, fallback ke change
        const stock = update.stock;
        const naturalResponse = update.natural_response;

        // Validasi: Harus ada 'productId' atau 'name', dan 'amount' atau 'stock'
        if ((!productId && !update.name) || (typeof stock !== 'number' && typeof amount !== 'number')) {
             return NextResponse.json({ message: 'Bad Request: "productId" or "name" is required, and either "stock" (absolute) or "amount" (relative) must be provided.' }, { status: 400 });
        }

        let finalProductId: string | undefined = productId;
        
        if (update.name && !finalProductId) {
            const productSnapshot = await adminDb.collection("products").where("name", "==", update.name).limit(1).get();
            if (!productSnapshot.empty) {
                finalProductId = productSnapshot.docs[0].id;
            } else {
                return NextResponse.json({ message: `Product with name "${update.name}" not found.` }, { status: 404 });
            }
        }

        if (!finalProductId) {
            return NextResponse.json({ message: 'Bad Request: Product ID could not be determined.' }, { status: 400 });
        }

        const productRef = adminDb.collection("products").doc(finalProductId);
        const productDoc = await productRef.get();
        if (!productDoc.exists) {
            return NextResponse.json({ message: `Product with ID "${finalProductId}" not found.` }, { status: 404 });
        }
        const productData = productDoc.data() as Product;

        let stockChange = 0;
        let newStock = 0;

        if (typeof amount === 'number') {
            stockChange = amount;
            newStock = productData.stock + stockChange;
        } else if (typeof stock === 'number') {
            stockChange = stock - productData.stock;
            newStock = stock;
        }

        const batch = adminDb.batch();

        batch.update(productRef, { stock: newStock });

        const sessionInfo = update.session || { name: "Bot Telegram", position: "Sistem" }; 

        if (stockChange > 0) {
            const historyRef = adminDb.collection("stock_history").doc();
            batch.set(historyRef, {
                timestamp: FieldValue.serverTimestamp(),
                session: sessionInfo,
                product: {
                    id: finalProductId,
                    name: productData.name,
                    image: productData.image,
                },
                quantityAdded: stockChange,
                stockAfter: newStock,
            });
        } else if (stockChange < 0) {
            const historyRef = adminDb.collection("sales_history").doc();
             const saleItem: SaleHistoryItem = {
                productId: finalProductId,
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

        await batch.commit();

        return NextResponse.json({ 
            status: "success", 
            message: naturalResponse || `Stock for ${productData.name} updated to ${newStock}.`,
            productName: productData.name,
            newStock: newStock,
        }, { status: 200 });

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
