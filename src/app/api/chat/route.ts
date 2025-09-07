
import { NextResponse, type NextRequest } from "next/server";
import { chat, type ChatInput } from "@/ai/flows/chat-flow";

// --- PENTING: Menonaktifkan Caching di Vercel ---
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

export async function POST(req: NextRequest) {
    if (!authenticateRequest(req)) {
        return NextResponse.json({ message: 'Unauthorized: Invalid or missing API Key.' }, { status: 401 });
    }

    let input: ChatInput;
    try {
        const body = await req.json();
        // Validasi sederhana, bisa diganti dengan Zod jika perlu
        if (typeof body.message !== 'string') {
            throw new Error("Invalid payload: 'message' must be a string.");
        }
        input = {
            message: body.message,
            history: body.history // history bersifat opsional
        };
    } catch (error: any) {
        return NextResponse.json({ message: `Bad Request: ${error.message}` }, { status: 400 });
    }

    try {
        const response = await chat(input);
        return NextResponse.json(response, { 
            status: 200,
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    } catch (error: any) {
        console.error("Error in POST /api/chat:", error);
        return NextResponse.json({ message: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}
