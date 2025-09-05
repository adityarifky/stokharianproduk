
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/server"; // Menggunakan koneksi admin

// Fungsi otentikasi yang lebih sederhana dan kuat
const authenticateRequest = (req: NextRequest) => {
    const serverApiKey = process.env.N8N_API_KEY;

    if (!serverApiKey) {
        console.error("CRITICAL: N8N_API_KEY environment variable is not set on the server.");
        return false;
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
        console.log("Authentication failed: Missing Authorization header.");
        return false;
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        console.log("Authentication failed: Malformed Authorization header.");
        return false;
    }

    const submittedToken = parts[1];
    if (submittedToken === serverApiKey) {
      console.log("Authentication successful.");
      return true;
    } else {
      console.log("Authentication failed: Invalid token.");
      return false;
    }
}

/**
 * @swagger
 * /api/stock:
 *   get:
 *     summary: Retrieve a list of all products OR a specific product/category.
 *     description: |
 *       - If no query parameters are provided, it fetches all products.
 *       - If 'intent' and 'entity' query parameters are provided, it processes the request
 *         and returns the stock data relevant to that intent and entity.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: intent
 *         schema:
 *           type: string
 *           enum: [product_stock, category_stock]
 *         description: The user's intent (e.g., asking for a product or category).
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *         description: The specific product or category name.
 *     responses:
 *       200:
 *         description: An array of product objects or a processed data object.
 *       401:
 *         description: Unauthorized. API Key is missing or invalid.
 *       500:
 *         description: Internal Server Error.
 */
export async function GET(req: NextRequest) {
    if (!authenticateRequest(req)) {
        return NextResponse.json({ message: 'Unauthorized: Invalid or missing API Key.' }, { status: 401 });
    }

    try {
        if (!adminDb) {
          throw new Error("Firestore Admin is not initialized.");
        }
        const productsCollection = adminDb.collection("products");
        const productSnapshot = await productsCollection.get();
        
        if (productSnapshot.empty) {
            return NextResponse.json({ dataForResponse: "Info: Stok lagi kosong semua nih, bro." }, { status: 200 });
        }

        const allProducts = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const { searchParams } = new URL(req.url);
        const intent = searchParams.get('intent');
        const entity = searchParams.get('entity');

        // Jika tidak ada intent & entity, kembalikan semua produk (untuk debug atau penggunaan lain)
        if (!intent || !entity || intent === 'unknown') {
            const productList = allProducts.map(p => p.name).join(', ');
            const categoryList = [...new Set(allProducts.map(p => p.category))].join(', ');
            const dataForResponse = `Aku kurang ngerti maksudmu, bro. Coba tanya soal produk atau kategori yang ada di daftar ini ya:\n\nProduk: ${productList}\n\nKategori: ${categoryList}`;
            return NextResponse.json({ dataForResponse }, { status: 200 });
        }

        // ---- LOGIKA BARU DI SINI ----
        let dataForResponse = `Info: Aku kurang ngerti maksudmu, bro. Coba tanya soal stok produk atau kategori, ya.`;
        const lowerCaseEntity = entity.toLowerCase();

        if (intent === 'category_stock') {
            const productsInCategory = allProducts.filter(p => p.category && p.category.toLowerCase() === lowerCaseEntity);

            if (productsInCategory.length > 0) {
                const stockDetails = productsInCategory.map(item => `- ${item.name} sisa *${item.stock}*`).join('\n');
                dataForResponse = `Ini data stok untuk kategori *${entity}*:\n${stockDetails}`;
            } else {
                dataForResponse = `Info: Stok untuk kategori *${entity}* lagi kosong semua, bro.`;
            }
        } else if (intent === 'product_stock') {
            const foundProduct = allProducts.find(p => p.name && p.name.toLowerCase() === lowerCaseEntity);

            if (foundProduct) {
                dataForResponse = `Info: Stok *${foundProduct.name}* sisa *${foundProduct.stock}*.`;
            } else {
                dataForResponse = `Info: Produk *${entity}* gak ketemu, bro. Coba cek lagi namanya.`;
            }
        }
        
        return NextResponse.json({ dataForResponse }, { status: 200 });

    } catch (error: any) {
        console.error("Error in GET /api/stock:", error);
        return NextResponse.json({ message: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}


/**
 * @swagger
 * /api/stock:
 *   post:
 *     summary: Update stock for one or more products.
 *     description: Updates the stock count for multiple products in a single atomic transaction.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     stock:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Stock updated successfully.
 *       400:
 *         description: Bad Request.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal Server Error.
 */
interface StockUpdate {
    id: string;
    stock: number;
}

export async function POST(req: NextRequest) {
    if (!authenticateRequest(req)) {
        return NextResponse.json({ message: 'Unauthorized: Invalid or missing API Key.' }, { status: 401 });
    }
    
    if (!adminDb) {
      console.error("Firestore Admin is not initialized. Check server environment variables.");
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
        console.error("Firestore Admin SDK Error:", error);
        const errorMessage = `Failed to update stock in Firestore. Code: ${error.code}. Message: ${error.message}`;
        return NextResponse.json({ message: `Internal Server Error: ${errorMessage}` }, { status: 500 });
    }
}
