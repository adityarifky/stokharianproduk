
import { NextRequest, NextResponse } from "next/server";
import { type MessageData } from "genkit/ai";
import { conversationalChat } from "@/ai/flows/chat-flow";

export const dynamic = 'force-dynamic';

// This endpoint is now connected to the actual Genkit flow.
export async function POST(req: NextRequest) {
  try {
    const { history } = (await req.json()) as { history: MessageData[] };

    if (!history || !Array.isArray(history)) {
      return NextResponse.json(
        {
          error: "Invalid request body. 'history' must be an array of messages.",
        },
        { status: 400 }
      );
    }

    // Call the actual conversational chat flow with the history.
    const answer = await conversationalChat(history);

    return NextResponse.json({ answer });

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
