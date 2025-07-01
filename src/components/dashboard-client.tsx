
"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  onSnapshot,
  where,
  getDocs,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { id as IndonesianLocale } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

import type { Product, SaleHistory, StockUpdateHistory } from "@/lib/types";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/context/SessionContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Cookie, CakeSlice, Layers, CupSoda, Box, MoreHorizontal, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

interface ChartData {
  date: string;
  stokMasuk: number;
  stokKeluar: number;
}

export function DashboardClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryCounts, setCategoryCounts] = useState({
    Creampuff: 0,
    Cheesecake: 0,
    Millecrepes: 0,
    Minuman: 0,
    Snackbox: 0,
    Lainnya: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [currentDate, setCurrentDate] = useState("");
  const { toast } = useToast();
  const { sessionEstablished } = useSession();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -6),
    to: new Date(),
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    if (!sessionEstablished) {
      setLoading(false);
      setLoadingChart(false);
      return;
    }
    
    setLoading(true);
    const q = query(collection(db, "products"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const productData: Product[] = [];
      querySnapshot.forEach((doc) => {
        productData.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(productData);
      setLoading(false);
    }, (error: any) => {
      console.error("Error fetching products: ", error);
      if (error.code === 'permission-denied') {
        toast({
            variant: "destructive",
            title: "Akses Ditolak!",
            description: "Pastikan aturan keamanan Firestore (security rules) sudah benar.",
        });
      } else {
        toast({
            variant: "destructive",
            title: "Gagal Memuat Data",
            description: `Gagal memuat produk. Error: ${error.code}.`,
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast, sessionEstablished]);

  useEffect(() => {
    if (!sessionEstablished || !dateRange?.from) {
      return;
    }

    const fetchChartData = async () => {
      setLoadingChart(true);
      
      const { from, to } = dateRange;
      const startDate = startOfDay(from);
      const endDate = to ? endOfDay(to) : endOfDay(from);

      try {
        // Fetch stock updates (incoming)
        const stockQuery = query(
          collection(db, "stock_history"),
          where("timestamp", ">=", Timestamp.fromDate(startDate)),
          where("timestamp", "<=", Timestamp.fromDate(endDate))
        );
        const stockSnapshot = await getDocs(stockQuery);
        const stockUpdates = stockSnapshot.docs.map(doc => doc.data() as StockUpdateHistory);

        // Fetch sales (outgoing)
        const salesQuery = query(
          collection(db, "sales_history"),
          where("timestamp", ">=", Timestamp.fromDate(startDate)),
          where("timestamp", "<=", Timestamp.fromDate(endDate))
        );
        const salesSnapshot = await getDocs(salesQuery);
        const sales = salesSnapshot.docs.map(doc => doc.data() as SaleHistory);
        
        const dailyData = new Map<string, { stokMasuk: number; stokKeluar: number }>();

        // Initialize all days in the range
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateKey = format(currentDate, "yyyy-MM-dd");
            dailyData.set(dateKey, { stokMasuk: 0, stokKeluar: 0 });
            currentDate = addDays(currentDate, 1);
        }

        // Aggregate stock updates
        stockUpdates.forEach(update => {
            const dateKey = format(update.timestamp.toDate(), "yyyy-MM-dd");
            if (dailyData.has(dateKey)) {
                dailyData.get(dateKey)!.stokMasuk += update.quantityAdded;
            }
        });
        
        // Aggregate sales
        sales.forEach(sale => {
            const dateKey = format(sale.timestamp.toDate(), "yyyy-MM-dd");
            if (dailyData.has(dateKey)) {
                dailyData.get(dateKey)!.stokKeluar += sale.totalItems;
            }
        });

        const formattedData = Array.from(dailyData.entries())
          .map(([date, data]) => ({
            date: format(new Date(date), "d MMM"),
            ...data
          }))
          .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        setChartData(formattedData);

      } catch (error: any) {
        console.error("Error fetching chart data: ", error);
        toast({
          variant: "destructive",
          title: "Gagal Memuat Grafik",
          description: `Gagal mengambil data riwayat. Error: ${error.code}`,
        });
      } finally {
        setLoadingChart(false);
      }
    };

    fetchChartData();
  }, [dateRange, sessionEstablished, toast]);

  useEffect(() => {
    const counts = {
      Creampuff: 0,
      Cheesecake: 0,
      Millecrepes: 0,
      Minuman: 0,
      Snackbox: 0,
      Lainnya: 0,
    };
    products.forEach(product => {
      if (product.category in counts) {
        counts[product.category as keyof typeof counts]++;
      }
    });
    setCategoryCounts(counts);
  }, [products]);
  
  useEffect(() => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    setCurrentDate(today.toLocaleDateString('id-ID', options).replace(/,/g, ''));
  }, []);
  
  return (
    <div className="flex h-full flex-col">
       <div className="flex-none border-b bg-background p-4 md:p-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline">Dashboard</h1>
        <p className="text-muted-foreground font-serif">Ringkasan stok produk harian Anda.</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
        {loading ? (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <Card className="transition-transform duration-200 ease-in-out hover:scale-105 active:scale-105">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Creampuff</CardTitle>
                    <Cookie className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold">{categoryCounts.Creampuff}</div>
                    <p className="text-xs text-muted-foreground font-serif">{currentDate || 'Memuat...'}</p>
                    </CardContent>
                </Card>
                <Card className="transition-transform duration-200 ease-in-out hover:scale-105 active:scale-105">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cheesecake</CardTitle>
                    <CakeSlice className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold">{categoryCounts.Cheesecake}</div>
                    <p className="text-xs text-muted-foreground font-serif">{currentDate || 'Memuat...'}</p>
                    </CardContent>
                </Card>
                <Card className="transition-transform duration-200 ease-in-out hover:scale-105 active:scale-105">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Millecrepes</CardTitle>
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold">{categoryCounts.Millecrepes}</div>
                    <p className="text-xs text-muted-foreground font-serif">{currentDate || 'Memuat...'}</p>
                    </CardContent>
                </Card>
                <Card className="transition-transform duration-200 ease-in-out hover:scale-105 active:scale-105">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Minuman</CardTitle>
                    <CupSoda className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold">{categoryCounts.Minuman}</div>
                    <p className="text-xs text-muted-foreground font-serif">{currentDate || 'Memuat...'}</p>
                    </CardContent>
                </Card>
                <Card className="transition-transform duration-200 ease-in-out hover:scale-105 active:scale-105">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Snackbox</CardTitle>
                    <Box className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold">{categoryCounts.Snackbox}</div>
                    <p className="text-xs text-muted-foreground font-serif">{currentDate || 'Memuat...'}</p>
                    </CardContent>
                </Card>
                <Card className="transition-transform duration-200 ease-in-out hover:scale-105 active:scale-105">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Lainnya</CardTitle>
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                    <div className="text-2xl font-bold">{categoryCounts.Lainnya}</div>
                    <p className="text-xs text-muted-foreground font-serif">{currentDate || 'Memuat...'}</p>
                    </CardContent>
                </Card>
            </div>
        )}
        <Card>
            <CardHeader className="flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle>Grafik Stok</CardTitle>
                    <CardDescription>Perbandingan stok masuk dan keluar berdasarkan rentang tanggal.</CardDescription>
                </div>
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
                    <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        locale={IndonesianLocale}
                    />
                    </PopoverContent>
                </Popover>
            </CardHeader>
            <CardContent>
                {loadingChart ? (
                    <div className="flex h-[350px] w-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}`}
                                allowDecimals={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'hsl(var(--muted))' }}
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: 'var(--radius)',
                                }}
                            />
                            <Legend wrapperStyle={{fontSize: "14px"}}/>
                            <Bar dataKey="stokMasuk" name="Stok Masuk" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="stokKeluar" name="Stok Keluar" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
