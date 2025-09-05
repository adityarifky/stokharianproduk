
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles, Sun } from 'lucide-react';

export function LoginClientFeatures() {
  const [showPopup, setShowPopup] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);

  useEffect(() => {
    // This effect runs only on the client after hydration
    const popupTimer = setTimeout(() => {
      setShowPopup(true);
    }, 500);

    const clockTimer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    // Set initial time immediately on client to start the clock
    setCurrentDateTime(new Date());

    return () => {
      clearTimeout(popupTimer);
      clearInterval(clockTimer);
    };
  }, []);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/\./g, ':');
  };
  
  return (
    <>
        <div className="fixed top-4 left-4 z-50 flex items-center gap-3 rounded-lg border bg-card/80 backdrop-blur-sm p-3 shadow-lg text-card-foreground">
            <Sun className="h-8 w-8 text-primary animate-spin [animation-duration:10s]" />
            <div>
            {currentDateTime ? (
                <>
                <p className="font-bold font-headline">{formatDate(currentDateTime)}</p>
                <p className="text-sm text-muted-foreground">{formatTime(currentDateTime)}</p>
                </>
            ) : (
                <>
                <p className="font-bold font-headline animate-pulse">Memuat tanggal...</p>
                <p className="text-sm text-muted-foreground animate-pulse">Memuat jam...</p>
                </>
            )}
            </div>
        </div>

        <div
            className={cn(
            "fixed top-4 right-4 z-50 w-full max-w-xs rounded-lg border bg-card p-4 shadow-lg text-card-foreground transition-all duration-500 ease-in-out font-headline",
            "transform opacity-0 translate-x-4",
            showPopup && "opacity-100 translate-x-0"
            )}
            role="alert"
        >
            <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div className="flex-1">
                    <p className="text-sm/relaxed font-normal">
                        Selamat pagi teman teman! Kamu capek? Gak apa-apa kok... aku juga kadang ngerasa gitu. Tapi pelan-pelan aja, ya. Kita gak harus cepet, yang penting gak nyerah💪. Aku percaya, kamu bisa nyampe ke tujuan kamu, asal jangan berhenti sekarang ✨💖.
                    </p>
                </div>
            </div>
            <Button onClick={() => setShowPopup(false)} className="w-full" suppressHydrationWarning>
                PASTI!
            </Button>
            </div>
      </div>
    </>
  );
}
