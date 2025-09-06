
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/server";
import { Timestamp } from "firebase-admin/firestore";

// Fungsi otentikasi yang sama dengan di /api/stock
const authenticateRequest = (req: NextRequest) => {
    const serverApiKey = process.env.N8N_API_KEY;
    if (!serverApiKey) return false;
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return false;
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return false;
    return parts[1] === serverApiKey;
}

/**
 * @swagger
 * /api/history:
 *   get:
 *     summary: Retrieve a summary of recent stock activities (incoming vs outgoing).
 *     description: |
 *       Fetches a summary of sales and stock additions within a specified timeframe (defaults to the last 24 hours).
 *       This is useful for getting a quick overview of product movement.
 *     parameters:
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *         description: The number of past hours to look back for the summary. Defaults to 24.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: A summary object of stock movements.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalStockIn:
 *                   type: integer
 *                   description: Total items added to stock.
 *                 totalStockOut:
 *                   type: integer
 *                   description: Total items sold.
 *                 timeframeHours:
 *                   type: integer
 *                   description: The timeframe for the summary in hours.
 *       401:
 *         description: Unauthorized. API Key is missing or invalid.
 *       500:
 *         description: Internal ServerError.
 */
export async function GET(req: NextRequest) {
    if (!authenticateRequest(req)) {
        return NextResponse.json({ message: 'Unauthorized: Invalid or missing API Key.' }, { status: 401 });
    }

    if (!adminDb) {
      console.error("Firestore Admin is not initialized.");
      return NextResponse.json({ message: 'Internal Server Error: Firebase configuration error.' }, { status: 500 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const hours = parseInt(searchParams.get('hours') || '24', 10);
        const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000);
        const sinceTimestamp = Timestamp.fromDate(sinceDate);

        // Get total stock additions
        const stockQuery = adminDb.collection("stock_history").where("timestamp", ">=", sinceTimestamp);
        const stockSnapshot = await stockQuery.get();
        const totalStockIn = stockSnapshot.docs.reduce((sum, doc) => sum + (doc.data().quantityAdded || 0), 0);

        // Get total sales
        const salesQuery = adminDb.collection("sales_history").where("timestamp", ">=", sinceTimestamp);
        const salesSnapshot = await salesQuery.get();
        const totalStockOut = salesSnapshot.docs.reduce((sum, doc) => sum + (doc.data().totalItems || 0), 0);
        
        return NextResponse.json({
            totalStockIn,
            totalStockOut,
            timeframeHours: hours
        }, { status: 200 });

    } catch (error: any) {
        console.error("Error in GET /api/history:", error);
        return NextResponse.json({ message: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}
