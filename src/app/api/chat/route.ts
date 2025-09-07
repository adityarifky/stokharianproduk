'use server';

import {chat, type ChatInput} from '@/ai/flows/chat-flow';
import {NextRequest, NextResponse} from 'next/server';

export async function POST(req: NextRequest) {
  const input = (await req.json()) as ChatInput;
  const response = await chat(input);
  return NextResponse.json(response);
}
