
import { NextResponse, type NextRequest } from "next/server";
import { collection, getDocs, doc, writeBatch, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Product } from "@/lib/types";

// IMPORTANT: Create a .env.local file in the root of your project
// and add your secret API key like this:
// NEXT_PUBLIC_N8N_API_KEY=your_super_secret_api_key_here

const getApiKey = () => {
    // Vercel might require the NEXT_PUBLIC_ prefix to expose env vars to serverless functions.
    // We check for both to be safe.
    const apiKey = process.env.NEXT_PUBLIC_N8N_API_KEY || process.env.N8N_API_KEY;
    if (!apiKey) {
        console.error("N8N_API_KEY or NEXT_PUBLIC_N8N_API_KEY environment variable is not set.");
        return "MISSING_API_KEY";
    }
    return apiKey;
}

const authenticateRequest = (req: NextRequest) => {
    const authHeader = req.headers.get('authorization');
    const apiKey = getApiKey();
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    return token === apiKey;
}

/**
 * @swagger
 * /api/stock:
 *   get:
 *     summary: Retrieve a list of all products and their stock.
 *     description: Fetches all products from the Firestore database. Requires API Key authentication.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: A list of products.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
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
        const productsCollection = collection(db, "products");
        const productSnapshot = await getDocs(productsCollection);
        const productList = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
        return NextResponse.json(productList, { status: 200 });
    } catch (error: any) {
        console.error("Error fetching products:", error);
        return NextResponse.json({ message: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}


/**
 * @swagger
 * /api/stock:
 *   post:
 *     summary: Update stock for one or more products.
 *     description: Updates the stock count for multiple products in a single atomic transaction. Requires API Key authentication.
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
 *                       description: The ID of the product to update.
 *                     stock:
 *                       type: integer
 *                       description: The new stock count.
 *                   required:
 *                     - id
 *                     - stock
 *     responses:
 *       200:
 *         description: Stock updated successfully.
 *       400:
 *         description: Bad Request. Invalid payload format.
 *       401:
 *         description: Unauthorized. API Key is missing or invalid.
 *       500:
 *         description: Internal Server Error or transaction failed.
 */
interface StockUpdate {
    id: string;
    stock: number;
}

export async function POST(req: NextRequest) {
    if (!authenticateRequest(req)) {
        return NextResponse.json({ message: 'Unauthorized: Invalid or missing API Key.' }, { status: 401 });
    }

    let updates: StockUpdate[];
    try {
        const body = await req.json();
        updates = body.updates;
        if (!Array.isArray(updates) || updates.some(u => typeof u.id !== 'string' || typeof u.stock !== 'number')) {
            throw new Error("Invalid payload format. 'updates' must be an array of objects with 'id' (string) and 'stock' (number).");
        }
    } catch (error: any) {
        return NextResponse.json({ message: `Bad Request: ${error.message}` }, { status: 400 });
    }

    try {
        const batch = writeBatch(db);
        updates.forEach(update => {
            const productRef = doc(db, "products", update.id);
            batch.update(productRef, { stock: update.stock });
        });
        await batch.commit();

        return NextResponse.json({ message: "Stock updated successfully." }, { status: 200 });

    } catch (error: any) {
        console.error("Error updating stock:", error);
        return NextResponse.json({ message: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}
