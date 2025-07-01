
"use client";

import { useState, useEffect } from "react";
import type { Product } from "@/lib/types";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  onSnapshot,
} from "firebase/firestore";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Cookie, CakeSlice, Layers, CupSoda, Box, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [currentDate, setCurrentDate] = useState("");
  const { toast } = useToast();

  useEffect(() => {
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
  }, [toast]);

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
        counts[product.category]++;
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
  
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-200px)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
      <Card className="transition-transform duration-200 ease-in-out hover:scale-105 active:scale-105">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Creampuff</CardTitle>
          <Cookie className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{categoryCounts.Creampuff}</div>
          <p className="text-xs text-muted-foreground">{currentDate || 'Memuat...'}</p>
        </CardContent>
      </Card>
      <Card className="transition-transform duration-200 ease-in-out hover:scale-105 active:scale-105">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cheesecake</CardTitle>
          <CakeSlice className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{categoryCounts.Cheesecake}</div>
          <p className="text-xs text-muted-foreground">{currentDate || 'Memuat...'}</p>
        </CardContent>
      </Card>
      <Card className="transition-transform duration-200 ease-in-out hover:scale-105 active:scale-105">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Millecrepes</CardTitle>
          <Layers className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{categoryCounts.Millecrepes}</div>
          <p className="text-xs text-muted-foreground">{currentDate || 'Memuat...'}</p>
        </CardContent>
      </Card>
      <Card className="transition-transform duration-200 ease-in-out hover:scale-105 active:scale-105">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Minuman</CardTitle>
          <CupSoda className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{categoryCounts.Minuman}</div>
          <p className="text-xs text-muted-foreground">{currentDate || 'Memuat...'}</p>
        </CardContent>
      </Card>
      <Card className="transition-transform duration-200 ease-in-out hover:scale-105 active:scale-105">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Snackbox</CardTitle>
          <Box className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{categoryCounts.Snackbox}</div>
          <p className="text-xs text-muted-foreground">{currentDate || 'Memuat...'}</p>
        </CardContent>
      </Card>
      <Card className="transition-transform duration-200 ease-in-out hover:scale-105 active:scale-105">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Lainnya</CardTitle>
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{categoryCounts.Lainnya}</div>
          <p className="text-xs text-muted-foreground">{currentDate || 'Memuat...'}</p>
        </CardContent>
      </Card>
    </div>
  );
}
