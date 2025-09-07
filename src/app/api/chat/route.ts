
import { conversationalChat } from "@/ai/flows/chat-flow";
import { NextRequest, NextResponse } from "next/server";
import { Message } from "genkit/generate";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { history } = (await req.json()) as { history: Message[] };

    if (!history || !Array.isArray(history)) {
      return NextResponse.json(
        {
          error: "Invalid request body. 'history' must be an array of messages.",
        },
        { status: 400 }
      );
    }

    const response = await conversationalChat(history);

    return NextResponse.json({ answer: response });

  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    return NextResponse.json(
      {
        error: "An internal server error occurred.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
