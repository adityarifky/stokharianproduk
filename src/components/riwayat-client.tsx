
"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { Loader2, User, Calendar, Box } from "lucide-react";
import Image from "next/image";

import { db } from "@/lib/firebase";
import type { SaleHistory } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSession } from "@/context/SessionContext";

export function RiwayatClient() {
  const { toast } = useToast();
  const [history, setHistory] = useState<SaleHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { sessionEstablished } = useSession();

  useEffect(() => {
    if (!sessionEstablished) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, "sales_history"), orderBy("timestamp", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const historyData: SaleHistory[] = [];
      querySnapshot.forEach((doc) => {
        historyData.push({ id: doc.id, ...doc.data() } as SaleHistory);
      });
      setHistory(historyData);
      setLoading(false);
    }, (error: any) => {
      console.error("Firestore listener error:", error);
      toast({
          variant: "destructive",
          title: "Gagal Memuat Riwayat",
          description: `Tidak dapat mengambil data riwayat penjualan. Error: ${error.code}`,
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast, sessionEstablished]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit', minute: '2-digit',
        day: '2-digit', month: 'long', year: 'numeric'
    }).format(date);
  }
  
  if (loading && sessionEstablished) {
    return (
        <div className="flex h-[calc(100vh-200px)] w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
       <div className="flex-none border-b bg-background p-4 md:p-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline">Riwayat Penjualan</h1>
        <p className="text-muted-foreground">Daftar semua transaksi penjualan yang telah disimpan.</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {history.length > 0 ? (
            <div className="space-y-4">
                {history.map((entry) => (
                    <Card key={entry.id}>
                        <CardHeader>
                            <CardTitle className="text-lg">Transaksi oleh {entry.session.name}</CardTitle>
                             <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {formatDate(entry.timestamp)}</span>
                                <span className="flex items-center gap-1"><User className="h-4 w-4" /> {entry.session.position}</span>
                                <span className="flex items-center gap-1"><Box className="h-4 w-4" /> {entry.totalItems} produk terjual</span>
                             </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="items">
                                    <AccordionTrigger>Lihat Detail Produk</AccordionTrigger>
                                    <AccordionContent>
                                        <ul className="space-y-2 pt-2">
                                            {entry.items.map((item) => (
                                                <li key={item.productId} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <Image src={item.image} alt={item.productName} width={40} height={40} className="rounded-md object-cover aspect-square" data-ai-hint="product pastry" />
                                                        <span>{item.productName}</span>
                                                    </div>
                                                    <span className="font-medium">x {item.quantity}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>
                ))}
            </div>
        ) : (
             <div className="flex h-full min-h-[400px] w-full items-center justify-center">
                <div className="text-center">
                    <p className="text-lg font-semibold">Belum Ada Riwayat</p>
                    <p className="text-muted-foreground">Belum ada transaksi penjualan yang tercatat.</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
