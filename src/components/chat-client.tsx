
'use client';

import { useState, useRef, useEffect } from 'react';
import type { MessageData } from 'genkit';
import { useSession } from '@/context/SessionContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Bot, User, CornerDownLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';

export function ChatClient() {
  const [history, setHistory] = useState<MessageData[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { sessionInfo, sessionEstablished } = useSession();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [history]);
  
  useEffect(() => {
    if (sessionEstablished) {
        setHistory([{
            role: 'model',
            content: [{ text: `Halo ${sessionInfo?.name || ''}! Aku PuffBot. Ada yang bisa aku bantu? Coba tanya "cek stok creampuff" deh.` }]
        }]);
    }
  }, [sessionEstablished, sessionInfo]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const newUserMessage: MessageData = {
      role: 'user',
      content: [{ text: input }],
    };
    const newHistory = [...history, newUserMessage];

    setHistory(newHistory);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: newHistory }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal terhubung ke AI.');
      }

      const { answer } = await response.json();
      
      const newModelMessage: MessageData = {
          role: 'model',
          content: [{ text: answer }]
      };
      
      setHistory([...newHistory, newModelMessage]);

    } catch (error: any) {
      console.error("Chat error:", error);
      toast({
        variant: 'destructive',
        title: 'Oops! Terjadi Kesalahan',
        description: error.message,
      });
      // Revert history on error
      setHistory(history);
    } finally {
      setLoading(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] bg-background">
       <div className="flex-none border-b bg-background p-4 md:p-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline">PuffBot AI Assistant</h1>
        <p className="text-muted-foreground font-serif">Asisten virtual untuk membantumu mengelola stok produk.</p>
      </div>

      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {history.map((msg, index) => (
          <div key={index} className={cn("flex items-start gap-4", msg.role === 'user' && 'justify-end')}>
            {msg.role === 'model' && (
              <Avatar className='border'>
                <AvatarImage src="/Logo%20Dreampuff.png" alt="PuffBot" className="p-1 object-contain" />
                <AvatarFallback>Bot</AvatarFallback>
              </Avatar>
            )}
            <div className={cn("max-w-md rounded-lg p-3", msg.role === 'model' ? "bg-muted" : "bg-primary text-primary-foreground")}>
              {msg.content.map((part, partIndex) => (
                <p key={partIndex} className="whitespace-pre-wrap text-sm leading-relaxed">{part.text}</p>
              ))}
            </div>
             {msg.role === 'user' && sessionInfo && (
              <Avatar className="h-9 w-9 border">
                <AvatarImage src={"https://placehold.co/100x100.png"} alt={sessionInfo.name} />
                <AvatarFallback>{sessionInfo.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
         {loading && (
          <div className="flex items-start gap-4">
              <Avatar className='border'>
                <AvatarImage src="/Logo%20Dreampuff.png" alt="PuffBot" className="p-1 object-contain" />
                <AvatarFallback>Bot</AvatarFallback>
              </Avatar>
            <div className="max-w-md rounded-lg p-3 bg-muted flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">PuffBot sedang berpikir...</p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t bg-background p-4">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanya PuffBot di sini..."
            className="pr-24 min-h-[48px] resize-none"
            disabled={loading || !sessionEstablished}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <p className="text-xs text-muted-foreground hidden md:block">
              Shift+<CornerDownLeft size={12} className="inline-block" /> untuk baris baru
            </p>
            <Button onClick={sendMessage} disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="sr-only">Kirim</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
