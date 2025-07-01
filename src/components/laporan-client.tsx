
"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy, where, getDocs } from "firebase/firestore";
import { Loader2, CalendarDays, TrendingUp, TrendingDown, FileSearch, Calendar as CalendarIcon } from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import { id as IndonesianLocale } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

import { db } from "@/lib/firebase";
import type { Report, ReportItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSession } from "@/context/SessionContext";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ImagePreviewDialog } from "./image-preview-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";

interface AccumulatedItem {
  productName: string;
  category: string;
  image: string;
  totalSold: number;
  totalRejected: number;
}

export function LaporanClient() {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const { sessionEstablished } = useSession();

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [accumulatedData, setAccumulatedData] = useState<AccumulatedItem[]>([]);
  const [isAccumulating, setIsAccumulating] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isAccumulationDialogOpen, setIsAccumulationDialogOpen] = useState(false);
  const isMobile = useIsMobile();

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

  const handleAccumulateReports = async () => {
    if (!dateRange?.from || !dateRange?.to) {
        toast({
            variant: "destructive",
            title: "Pilih Rentang Tanggal",
            description: "Anda harus memilih tanggal mulai dan akhir untuk membuat akumulasi.",
        });
        return;
    }

    setIsAccumulating(true);
    setAccumulatedData([]);

    try {
        const start = new Date(dateRange.from);
        start.setHours(0, 0, 0, 0);
        const end = new Date(dateRange.to);
        end.setHours(23, 59, 59, 999);

        const q = query(
            collection(db, "daily_reports"),
            where("timestamp", ">=", start),
            where("timestamp", "<=", end)
        );

        const querySnapshot = await getDocs(q);
        const aggregationMap = new Map<string, AccumulatedItem>();

        querySnapshot.forEach((doc) => {
            const report = doc.data() as Report;

            report.itemsSold.forEach(item => {
                const existing = aggregationMap.get(item.productName);
                if (existing) {
                    existing.totalSold += item.quantity;
                } else {
                    aggregationMap.set(item.productName, {
                        productName: item.productName,
                        category: item.category,
                        image: item.image,
                        totalSold: item.quantity,
                        totalRejected: 0,
                    });
                }
            });

            report.itemsRejected.forEach(item => {
                const existing = aggregationMap.get(item.productName);
                if (existing) {
                    existing.totalRejected += item.quantity;
                } else {
                    aggregationMap.set(item.productName, {
                        productName: item.productName,
                        category: item.category,
                        image: item.image,
                        totalSold: 0,
                        totalRejected: item.quantity,
                    });
                }
            });
        });
        
        const result = Array.from(aggregationMap.values()).sort((a,b) => a.productName.localeCompare(b.productName));
        setAccumulatedData(result);

        if (result.length === 0) {
            toast({
                title: "Tidak Ada Data",
                description: "Tidak ada laporan yang ditemukan untuk rentang tanggal yang dipilih.",
            });
        }

    } catch (error: any) {
        console.error("Error accumulating reports: ", error);
        toast({
            variant: "destructive",
            title: "Gagal Mengakumulasi Laporan",
            description: `Terjadi kesalahan. Error: ${error.code}`,
        });
    } finally {
        setIsAccumulating(false);
    }
  }

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
                                <button onClick={() => setPreviewImageUrl(item.image)} className="rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                    <Image src={item.image} alt={item.productName} width={40} height={40} className="rounded-md object-cover aspect-square" data-ai-hint="product pastry" />
                                </button>
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
    <>
    <div className="flex flex-col">
      <div className="flex-none border-b bg-background p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight font-headline">Laporan Harian</h1>
              <p className="text-muted-foreground font-serif">Ringkasan penjualan dan sisa stok setelah reset harian.</p>
            </div>
            <Button onClick={() => setIsAccumulationDialogOpen(true)}>
              <FileSearch className="mr-2 h-4 w-4" />
              Buat Laporan Akumulasi
            </Button>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 space-y-8">
        <div>
          {loading ? (
              <div className="flex h-64 w-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
          ) : reports.length > 0 ? (
              <div className="space-y-8">
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
               <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed">
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
    </div>
    
    <Dialog open={isAccumulationDialogOpen} onOpenChange={setIsAccumulationDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Buat Laporan Akumulasi</DialogTitle>
            <DialogDescription>
              Pilih rentang tanggal untuk melihat total penjualan dan sisa stok produk.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-full sm:w-[260px] justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "d LLL y", { locale: IndonesianLocale })} -{" "}
                          {format(dateRange.to, "d LLL y", { locale: IndonesianLocale })}
                        </>
                      ) : (
                        format(dateRange.from, "d LLL y", { locale: IndonesianLocale })
                      )
                    ) : (
                      <span>Pilih rentang tanggal</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={isMobile ? 1 : 2}
                    locale={IndonesianLocale}
                  />
                </PopoverContent>
              </Popover>
              <Button onClick={handleAccumulateReports} disabled={isAccumulating}>
                {isAccumulating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <FileSearch className="mr-2 h-4 w-4" />
                    Buat Laporan
                  </>
                )}
              </Button>
            </div>

            {isAccumulating ? (
              <div className="flex h-40 w-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : accumulatedData.length > 0 ? (
                <div className="rounded-md border max-h-[50vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[60px]">Gambar</TableHead>
                                <TableHead>Nama Produk</TableHead>
                                <TableHead>Kategori</TableHead>
                                <TableHead className="text-right">Total Terjual</TableHead>
                                <TableHead className="text-right">Total Sisa</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {accumulatedData.map((item) => (
                                <TableRow key={item.productName}>
                                    <TableCell>
                                        <button onClick={() => setPreviewImageUrl(item.image)} className="rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                            <Image src={item.image} alt={item.productName} width={40} height={40} className="rounded-md object-cover aspect-square" data-ai-hint="product pastry" />
                                        </button>
                                    </TableCell>
                                    <TableCell className="font-medium">{item.productName}</TableCell>
                                    <TableCell>{item.category}</TableCell>
                                    <TableCell className="text-right font-medium text-green-600">{item.totalSold}</TableCell>
                                    <TableCell className="text-right font-medium text-red-600">{item.totalRejected}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
              <div className="flex h-20 items-center justify-center text-center text-sm text-muted-foreground">
                Pilih rentang tanggal dan klik "Buat Laporan" untuk melihat hasilnya di sini.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
    <ImagePreviewDialog imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />
    </>
  );
}
