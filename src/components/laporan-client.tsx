
"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { Loader2, CalendarDays, TrendingUp, TrendingDown } from "lucide-react";
import Image from "next/image";

import { db } from "@/lib/firebase";
import type { Report, ReportItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSession } from "@/context/SessionContext";

export function LaporanClient() {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const { sessionEstablished } = useSession();

  useEffect(() => {
    if (!sessionEstablished) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, "daily_reports"), orderBy("timestamp", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const reportsData: Report[] = [];
      querySnapshot.forEach((doc) => {
        reportsData.push({ id: doc.id, ...doc.data() } as Report);
      });
      setReports(reportsData);
      setLoading(false);
    }, (error: any) => {
      console.error("Firestore listener error:", error);
      toast({
          variant: "destructive",
          title: "Gagal Memuat Laporan",
          description: `Tidak dapat mengambil data laporan. Error: ${error.code}`,
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast, sessionEstablished]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    }).format(date);
  }

  const renderReportTable = (items: ReportItem[], type: 'sold' | 'rejected') => {
      if (!items || items.length === 0) {
          return <p className="text-sm text-muted-foreground text-center py-4">Tidak ada produk untuk ditampilkan.</p>;
      }
      return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[60px]">Gambar</TableHead>
                        <TableHead>Nama Produk</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead className="text-right">{type === 'sold' ? 'Terjual' : 'Sisa'}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item, index) => (
                        <TableRow key={`${item.productName}-${index}`}>
                            <TableCell>
                                <Image src={item.image} alt={item.productName} width={40} height={40} className="rounded-md object-cover aspect-square" data-ai-hint="product pastry" />
                            </TableCell>
                            <TableCell className="font-medium">{item.productName}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
      );
  };
  
  return (
    <div className="flex h-full flex-col">
      <div className="flex-none border-b bg-background p-4 md:p-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline">Laporan Harian</h1>
        <p className="text-muted-foreground font-serif">Ringkasan penjualan dan sisa stok setelah reset harian.</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {loading ? (
            <div className="flex h-[calc(100vh-250px)] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : reports.length > 0 ? (
            <div className="space-y-4">
                {reports.map((report) => (
                    <Card key={report.id}>
                        <CardHeader>
                            <CardTitle className="text-lg">Laporan untuk {formatDate(report.timestamp)}</CardTitle>
                             <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                                <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> Dibuat Otomatis</span>
                                <span className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-green-500" /> {report.totalSold} produk terjual</span>
                                <span className="flex items-center gap-1.5"><TrendingDown className="h-4 w-4 text-red-500" /> {report.totalRejected} produk sisa</span>
                             </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Accordion type="multiple" className="w-full space-y-2">
                                <AccordionItem value="sold-items" className="border-b-0">
                                    <AccordionTrigger className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-md">Lihat Produk Terjual ({report.totalSold})</AccordionTrigger>
                                    <AccordionContent className="pt-2">
                                       {renderReportTable(report.itemsSold, 'sold')}
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="rejected-items" className="border-b-0">
                                    <AccordionTrigger className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-md">Lihat Produk Sisa / Reject ({report.totalRejected})</AccordionTrigger>
                                    <AccordionContent className="pt-2">
                                        {renderReportTable(report.itemsRejected, 'rejected')}
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>
                ))}
            </div>
        ) : (
             <div className="flex h-full min-h-[400px] w-full items-center justify-center rounded-lg border border-dashed">
                <div className="text-center">
                    <p className="text-lg font-semibold">Belum Ada Laporan</p>
                    <p className="text-muted-foreground font-serif">
                      Laporan akan dibuat secara otomatis saat Anda melakukan<br />"Reset Semua Stok" di halaman Produk.
                    </p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
