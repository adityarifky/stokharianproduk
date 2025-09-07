
'use server';

import { NextResponse, type NextRequest } from "next/server";
import { ai } from '@/ai/genkit';
import { z } from 'zod';

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

const chatRequestSchema = z.object({
  prompt: z.string(),
});

export async function POST(req: NextRequest) {
    if (!authenticateRequest(req)) {
        return NextResponse.json({ message: 'Unauthorized: Invalid or missing API Key.' }, { status: 401 });
    }

    let parsedBody;
    try {
        const body = await req.json();
        parsedBody = chatRequestSchema.parse(body);
    } catch (error) {
        return NextResponse.json({ message: 'Bad Request: Invalid JSON payload or structure.', error: (error as any).issues }, { status: 400 });
    }

    try {
        const system_prompt = `
        Anda adalah Dreambot, AI assistant yang ramah dan membantu untuk toko kue Dreampuff.
        Gunakan riwayat percakapan sebelumnya untuk menjaga konteks.
        Selalu jawab dalam Bahasa Indonesia yang santai dan bersahabat.
        JANGAN PERNAH menyertakan "Dreambot:" atau label apa pun di awal balasanmu. Langsung berikan jawabannya.
        
        Riwayat Percakapan:
        ---
        ${parsedBody.prompt}
        ---
        `;

        const { output } = await ai.generate({
            prompt: system_prompt,
            model: 'googleai/gemini-1.5-flash-latest',
        });
        
        if (!output || typeof output !== 'string') {
            throw new Error("Gagal mendapatkan balasan dari AI.");
        }

        return NextResponse.json({ reply: output }, { 
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
