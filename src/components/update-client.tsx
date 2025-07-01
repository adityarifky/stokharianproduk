
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  increment
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Minus, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/context/SessionContext";

const categories = ["Semua", "Creampuff", "Cheesecake", "Millecrepes", "Minuman", "Snackbox", "Lainnya"];

export function UpdateClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const { toast } = useToast();
  const { sessionEstablished } = useSession();

  useEffect(() => {
    if (!sessionEstablished) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const q = query(collection(db, "products"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const productData: Product[] = [];
      querySnapshot.forEach((doc) => {
        productData.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(productData.sort((a, b) => a.name.localeCompare(b.name)));
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
  
  const handleStockChange = async (product: Product, amount: number) => {
    if (product.stock + amount < 0) {
      toast({
        variant: "destructive",
        title: "Stok Tidak Cukup",
        description: "Stok produk tidak boleh kurang dari nol.",
      });
      return;
    }
    setUpdatingProductId(product.id);
    try {
      const productRef = doc(db, "products", product.id);
      await updateDoc(productRef, { stock: increment(amount) });
    } catch (error) {
      console.error("Error updating stock: ", error);
      toast({
        variant: "destructive",
        title: "Gagal Memperbarui Stok",
        description: "Terjadi kesalahan saat menyimpan ke database.",
      });
    } finally {
      setUpdatingProductId(null);
    }
  };

  const filteredProducts = products.filter(product => 
    selectedCategory === "Semua" || product.category === selectedCategory
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex-none border-b bg-background p-4 md:p-6">
        <h1 className="text-2xl font-bold tracking-tight">Update Produk</h1>
        <p className="text-muted-foreground">Catat semua perubahan produk secara realtime.</p>
        <div className="mt-4 w-full overflow-x-auto pb-2">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full min-w-max">
            <TabsList>
              {categories.map((category) => (
                <TabsTrigger key={category} value={category}>{category}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
           <div className="flex h-full w-full items-center justify-center">
             <Loader2 className="h-8 w-8 animate-spin text-primary" />
           </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="transition-transform duration-200 ease-in-out hover:scale-105 active:scale-105 flex flex-col overflow-hidden">
                <CardHeader className="p-0">
                  <div className="relative aspect-video w-full">
                    <Image src={product.image || 'https://placehold.co/600x400.png'} alt={product.name} fill className="object-cover" data-ai-hint="pastry dreampuff"/>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-4 pb-2">
                  <CardTitle className="text-lg leading-tight mb-1">{product.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">Stok saat ini</p>
                </CardContent>
                <CardFooter className="flex justify-center items-center gap-4 p-4 pt-0">
                    <Button variant="outline" size="icon" onClick={() => handleStockChange(product, -1)} disabled={product.stock <= 0 || updatingProductId === product.id}>
                        <Minus className="h-4 w-4" />
                    </Button>
                    <div className="text-2xl font-bold w-12 text-center">
                        {updatingProductId === product.id ? <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary"/> : product.stock}
                    </div>
                    <Button variant="outline" size="icon" onClick={() => handleStockChange(product, 1)} disabled={updatingProductId === product.id}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center h-full">
            <p className="text-lg font-semibold">Tidak Ada Produk</p>
            <p className="text-muted-foreground">Tidak ada produk yang ditemukan dalam kategori '{selectedCategory}'.</p>
          </div>
        )}
      </div>
    </div>
  );
}
