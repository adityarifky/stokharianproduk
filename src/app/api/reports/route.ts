
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/server";

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
 * /api/reports:
 *   get:
 *     summary: Retrieve a list of the most recent daily reports.
 *     description: Fetches generated daily reports from Firestore, ordered by most recent.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: The maximum number of reports to return. Defaults to 5.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: An array of report objects.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                   totalSold:
 *                     type: integer
 *                   totalRejected:
 *                     type: integer
 *                   session:
 *                     type: object
 *       401:
 *         description: Unauthorized. API Key is missing or invalid.
 *       500:
 *         description: Internal Server Error.
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
        const limit = parseInt(searchParams.get('limit') || '5', 10);
        
        const reportsQuery = adminDb.collection("daily_reports").orderBy("timestamp", "desc").limit(limit);
        const reportSnapshot = await reportsQuery.get();
        
        if (reportSnapshot.empty) {
            return NextResponse.json([], { status: 200 });
        }

        const reports = reportSnapshot.docs.map(doc => {
            const data = doc.data();
            // Format timestamp agar lebih mudah dibaca oleh AI/manusia
            const readableDate = data.timestamp.toDate().toLocaleString('id-ID', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
            return {
                id: doc.id,
                ...data,
                timestamp: data.timestamp.toDate().toISOString(), // ISO string untuk mesin
                readableDate: readableDate // String yang mudah dibaca
            };
        });
        
        return NextResponse.json(reports, { status: 200 });

    } catch (error: any) {
        console.error("Error in GET /api/reports:", error);
        return NextResponse.json({ message: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}
