import { NextRequest, NextResponse } from "next/server";
import { type MessageData } from "genkit/ai";

export const dynamic = 'force-dynamic';

// This is a placeholder endpoint. 
// The actual AI logic is now expected to be handled by the n8n workflow.
// This endpoint can be removed if n8n is calling the model directly.
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

    // Placeholder response as the logic is now in n8n
    const lastUserMessage = history.findLast(m => m.role === 'user')?.content[0].text || "No message found";

    return NextResponse.json({ 
        answer: `This is a placeholder response to your message: "${lastUserMessage}". The main AI logic should now be configured in your n8n workflow.` 
    });

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
