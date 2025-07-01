
'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";
import { LoginForm } from "@/components/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPopup(true);
    }, 500); // Delay showing the popup slightly
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div
        className={cn(
          "fixed top-4 right-4 z-50 w-full max-w-xs rounded-lg border bg-card p-4 shadow-lg text-card-foreground transition-all duration-500 ease-in-out font-headline",
          "transform translate-x-[calc(100%+2rem)] md:translate-x-0 md:opacity-0",
          showPopup && "translate-x-0 opacity-100"
        )}
        role="alert"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <div className="flex-1">
                  <p className="text-sm/relaxed font-normal">
                    Kamu capek? Gak apa-apa kok... aku juga kadang ngerasa gitu. Tapi pelan-pelan aja, ya. Kita gak harus cepet, yang penting gak nyerah💪. Aku percaya, kamu bisa nyampe ke tujuan kamu, asal jangan berhenti sekarang ✨💖.
                  </p>
              </div>
          </div>
          <Button onClick={() => setShowPopup(false)} className="w-full" suppressHydrationWarning>
            PASTI!
          </Button>
        </div>
      </div>

      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Image
          src="/Logo%20Dreampuff.png"
          alt="Dreampuff Logo"
          width={200}
          height={200}
          className="mb-6"
          priority
          data-ai-hint="company logo"
        />
        <Card className="w-full max-w-sm mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold tracking-tight font-headline text-primary">
              Stok Produk Harian
            </CardTitle>
            <CardDescription>
              Selamat datang brader! Monggo bisa masuk ke halaman kerja.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
