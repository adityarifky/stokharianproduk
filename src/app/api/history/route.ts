
'use server';

import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/server";
import { Timestamp } from "firebase-admin/firestore";

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
      console.error("Firestore Admin is not initialized.");
      return NextResponse.json({ message: 'Internal Server Error: Firebase configuration error.' }, { status: 500 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const hours = parseInt(searchParams.get('hours') || '24', 10);
        const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000);
        const sinceTimestamp = Timestamp.fromDate(sinceDate);

        // Get stock additions with details
        const stockQuery = adminDb.collection("stock_history")
            .where("timestamp", ">=", sinceTimestamp)
            .orderBy("timestamp", "desc");
        const stockSnapshot = await stockQuery.get();
        
        const stockAdditions = stockSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                productName: data.product.name,
                quantityAdded: data.quantityAdded,
                timestamp: data.timestamp.toDate().toISOString(),
            };
        });
        const totalStockIn = stockAdditions.reduce((sum, item) => sum + item.quantityAdded, 0);

        // Get total sales
        const salesQuery = adminDb.collection("sales_history").where("timestamp", ">=", sinceTimestamp);
        const salesSnapshot = await salesQuery.get();
        const totalStockOut = salesSnapshot.docs.reduce((sum, doc) => sum + (doc.data().totalItems || 0), 0);
        
        return NextResponse.json({
            totalStockIn,
            totalStockOut,
            stockAdditions, // Now we include the detailed list
            timeframeHours: hours
        }, { status: 200 });

    } catch (error: any) {
        console.error("Error in GET /api/history:", error);
        return NextResponse.json({ message: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}
