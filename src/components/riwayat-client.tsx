
"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy, where } from "firebase/firestore";
import { Loader2, User, Calendar as CalendarIcon, Box, CalendarDays, PackagePlus } from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import { id as IndonesianLocale } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

import { db } from "@/lib/firebase";
import type { SaleHistory, StockUpdateHistory } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSession } from "@/context/SessionContext";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ImagePreviewDialog } from "./image-preview-dialog";
import { useIsMobile } from "@/hooks/use-mobile";

type CombinedHistory = (SaleHistory & { type: 'sale' }) | (StockUpdateHistory & { type: 'stock_update' });

export function RiwayatClient() {
  const { toast } = useToast();
  const [salesHistory, setSalesHistory] = useState<SaleHistory[]>([]);
  const [stockHistory, setStockHistory] = useState<StockUpdateHistory[]>([]);
  const [combinedHistory, setCombinedHistory] = useState<CombinedHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { sessionEstablished } = useSession();
  const [date, setDate] = useState<DateRange | undefined>();
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!sessionEstablished) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Base queries
    const baseSalesQuery = query(collection(db, "sales_history"), orderBy("timestamp", "desc"));
    const baseStockQuery = query(collection(db, "stock_history"), orderBy("timestamp", "desc"));

    // Apply date filters
    let salesQuery = baseSalesQuery;
    let stockQuery = baseStockQuery;

    if (date?.from) {
      const start = new Date(date.from);
      start.setHours(0, 0, 0, 0);
      salesQuery = query(salesQuery, where("timestamp", ">=", start));
      stockQuery = query(stockQuery, where("timestamp", ">=", start));
    }
    if (date?.from) {
      const end = date.to ? new Date(date.to) : new Date(date.from);
      end.setHours(23, 59, 59, 999);
      salesQuery = query(salesQuery, where("timestamp", "<=", end));
      stockQuery = query(stockQuery, where("timestamp", "<=", end));
    }
    
    const unsubscribeSales = onSnapshot(salesQuery, (querySnapshot) => {
      const historyData: SaleHistory[] = [];
      querySnapshot.forEach((doc) => {
        historyData.push({ id: doc.id, ...doc.data() } as SaleHistory);
      });
      setSalesHistory(historyData);
    }, (error: any) => {
      console.error("Sales history listener error:", error);
      toast({
          variant: "destructive",
          title: "Gagal Memuat Riwayat Penjualan",
          description: `Tidak dapat mengambil data. Error: ${error.code}`,
      });
    });

    const unsubscribeStock = onSnapshot(stockQuery, (querySnapshot) => {
      const historyData: StockUpdateHistory[] = [];
      querySnapshot.forEach((doc) => {
        historyData.push({ id: doc.id, ...doc.data() } as StockUpdateHistory);
      });
      setStockHistory(historyData);
    }, (error: any) => {
      console.error("Stock history listener error:", error);
      toast({
          variant: "destructive",
          title: "Gagal Memuat Riwayat Stok",
          description: `Tidak dapat mengambil data. Error: ${error.code}`,
      });
    });

    return () => {
      unsubscribeSales();
      unsubscribeStock();
    };
  }, [toast, sessionEstablished, date]);

  useEffect(() => {
      const combined = [
          ...salesHistory.map(item => ({ ...item, type: 'sale' as const })),
          ...stockHistory.map(item => ({ ...item, type: 'stock_update' as const }))
      ];
      
      // Firestore Timestamps can be null briefly during server-side creation
      combined.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));

      setCombinedHistory(combined);
      setLoading(false);
  }, [salesHistory, stockHistory]);

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

  const renderSaleCard = (entry: SaleHistory) => (
    <Card key={entry.id}>
      <CardHeader>
        <CardTitle className="text-lg">Transaksi oleh {entry.session.name}</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
            <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {formatDate(entry.timestamp)}</span>
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
                                    <button onClick={() => setPreviewImageUrl(item.image)} className="rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                        <Image src={item.image} alt={item.productName} width={40} height={40} className="rounded-md object-cover aspect-square" data-ai-hint="product pastry" />
                                    </button>
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
  );

  const renderStockUpdateCard = (entry: StockUpdateHistory) => (
    <Card key={entry.id}>
      <CardHeader>
        <CardTitle className="text-lg">Penambahan Stok oleh {entry.session.name}</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
          <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {formatDate(entry.timestamp)}</span>
          <span className="flex items-center gap-1"><User className="h-4 w-4" /> {entry.session.position}</span>
          <span className="flex items-center gap-1"><PackagePlus className="h-4 w-4" /> {entry.quantityAdded} produk ditambah</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="flex items-center gap-4">
            <button onClick={() => setPreviewImageUrl(entry.product.image)} className="rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <Image src={entry.product.image} alt={entry.product.name} width={40} height={40} className="rounded-md object-cover aspect-square" data-ai-hint="product pastry" />
            </button>
            <span className="font-medium">{entry.product.name}</span>
          </div>
          <div className="text-right">
            <p className="font-bold text-green-600 text-lg">+{entry.quantityAdded}</p>
            <p className="text-xs text-muted-foreground">Stok menjadi {entry.stockAfter}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
    <div className="flex flex-col">
       <div className="flex-none border-b bg-background p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-headline">Riwayat Aktivitas</h1>
            <p className="text-muted-foreground font-serif">Daftar semua transaksi penjualan dan penambahan stok yang tercatat.</p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-full sm:w-[260px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "d LLL y", { locale: IndonesianLocale })} -{" "}
                      {format(date.to, "d LLL y", { locale: IndonesianLocale })}
                    </>
                  ) : (
                    format(date.from, "d LLL y", { locale: IndonesianLocale })
                  )
                ) : (
                  <span>Pilih rentang tanggal</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={isMobile ? 1 : 2}
                locale={IndonesianLocale}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="flex-1 p-4 md:p-8">
        {loading ? (
          <div className="flex min-h-[400px] w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : combinedHistory.length > 0 ? (
            <div className="space-y-8">
                {combinedHistory.map((entry) => {
                  if (entry.type === 'sale') {
                    return renderSaleCard(entry);
                  }
                  if (entry.type === 'stock_update') {
                    return renderStockUpdateCard(entry);
                  }
                  return null;
                })}
            </div>
        ) : (
             <div className="flex min-h-[400px] w-full items-center justify-center rounded-lg border border-dashed">
                <div className="text-center">
                    <p className="text-lg font-semibold">{date?.from ? "Tidak Ada Riwayat" : "Belum Ada Riwayat"}</p>
                    <p className="text-muted-foreground font-serif">
                      {date?.from ? "Tidak ada aktivitas yang ditemukan untuk rentang tanggal yang dipilih." : "Belum ada aktivitas penjualan atau stok yang tercatat."}
                    </p>
                </div>
            </div>
        )}
      </div>
    </div>
    <ImagePreviewDialog imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />
    </>
  );
}
