'use server';

import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/server";

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
        const limit = parseInt(searchParams.get('limit') || '5', 10);
        
        const reportsQuery = adminDb.collection("daily_reports").orderBy("timestamp", "desc").limit(limit);
        const reportSnapshot = await reportsQuery.get();
        
        if (reportSnapshot.empty) {
            return NextResponse.json([], { status: 200 });
        }

        const reports = reportSnapshot.docs.map(doc => {
            const data = doc.data();
            const readableDate = data.timestamp.toDate().toLocaleString('id-ID', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
            return {
                id: doc.id,
                ...data,
                timestamp: data.timestamp.toDate().toISOString(),
                readableDate: readableDate
            };
        });
        
        return NextResponse.json(reports, { status: 200 });

    } catch (error: any) {
        console.error("Error in GET /api/reports:", error);
        return NextResponse.json({ message: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}
