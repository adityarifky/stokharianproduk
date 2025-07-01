
"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import type { Product, SaleHistoryItem } from "@/lib/types";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  doc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Minus, Plus, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/context/SessionContext";

const categories = ["Semua", "Creampuff", "Cheesecake", "Millecrepes", "Minuman", "Snackbox", "Lainnya"];

export function UpdateClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [pendingChanges, setPendingChanges] = useState<Map<string, number>>(new Map());
  const { toast } = useToast();
  const { sessionEstablished, sessionInfo } = useSession();

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
      toast({
          variant: "destructive",
          title: "Gagal Memuat Data",
          description: `Gagal memuat produk. Error: ${error.code}.`,
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast, sessionEstablished]);
  
  const handleQuantityChange = (product: Product, amount: number) => {
    const currentSold = pendingChanges.get(product.id) || 0;
    const newSold = currentSold + amount;

    if (newSold < 0) return;
    if (newSold > product.stock) {
      toast({
        variant: "destructive",
        title: "Stok Tidak Cukup",
        description: `Hanya tersedia ${product.stock} stok untuk ${product.name}.`,
        duration: 2000,
      });
      return;
    }

    const newChanges = new Map(pendingChanges);
    if (newSold === 0) {
      newChanges.delete(product.id);
    } else {
      newChanges.set(product.id, newSold);
    }
    setPendingChanges(newChanges);
  };

  const handleSave = async () => {
    if (pendingChanges.size === 0) {
        toast({ title: "Tidak Ada Perubahan", description: "Tidak ada produk yang terjual untuk disimpan." });
        return;
    }
    if (!sessionInfo) {
        toast({ variant: "destructive", title: "Sesi Tidak Ditemukan", description: "Tidak dapat menyimpan karena informasi sesi tidak ada." });
        return;
    }

    setIsSaving(true);
    try {
        const batch = writeBatch(db);
        const historyItems: SaleHistoryItem[] = [];
        let totalItems = 0;

        for (const [productId, quantity] of pendingChanges.entries()) {
            if (quantity > 0) {
                const product = products.find(p => p.id === productId);
                if (product) {
                    const productRef = doc(db, "products", productId);
                    batch.update(productRef, { stock: product.stock - quantity });
                    historyItems.push({
                        productId: product.id,
                        productName: product.name,
                        quantity: quantity,
                        image: product.image
                    });
                    totalItems += quantity;
                }
            }
        }
        
        if (historyItems.length > 0) {
            const historyRef = doc(collection(db, "sales_history"));
            batch.set(historyRef, {
                timestamp: serverTimestamp(),
                session: sessionInfo,
                items: historyItems,
                totalItems: totalItems,
            });
        }

        await batch.commit();

        toast({
            title: "Sukses!",
            description: `Berhasil menyimpan penjualan ${totalItems} produk.`
        });
        setPendingChanges(new Map());

    } catch (error) {
        console.error("Error saving sales: ", error);
        toast({
            variant: "destructive",
            title: "Gagal Menyimpan",
            description: "Terjadi kesalahan saat menyimpan transaksi.",
        });
    } finally {
        setIsSaving(false);
    }
  };


  const filteredProducts = products.filter(product => 
    selectedCategory === "Semua" || product.category === selectedCategory
  );
  
  const totalPending = useMemo(() => Array.from(pendingChanges.values()).reduce((sum, current) => sum + current, 0), [pendingChanges]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-none border-b bg-background p-4 md:p-6">
        <h1 className="text-2xl font-bold tracking-tight">Catat Penjualan</h1>
        <p className="text-muted-foreground">Kurangi stok untuk setiap produk yang laku terjual, lalu simpan.</p>
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

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
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
                  <p className="text-sm text-muted-foreground">Stok tersedia: <span className="font-bold text-foreground">{product.stock}</span></p>
                </CardContent>
                <CardFooter className="flex justify-center items-center gap-4 p-4 pt-0">
                    <Button variant="outline" size="icon" onClick={() => handleQuantityChange(product, -1)} disabled={isSaving || (pendingChanges.get(product.id) || 0) <= 0}>
                        <Plus className="h-4 w-4" />
                    </Button>
                    <div className="text-2xl font-bold w-12 text-center">
                        {pendingChanges.get(product.id) || 0}
                    </div>
                    <Button variant="outline" size="icon" onClick={() => handleQuantityChange(product, 1)} disabled={isSaving || product.stock <= (pendingChanges.get(product.id) || 0)}>
                        <Minus className="h-4 w-4" />
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

      {totalPending > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-10 p-4 md:bottom-0">
            <div className="max-w-md mx-auto">
                <Button onClick={handleSave} disabled={isSaving} size="lg" className="w-full text-lg shadow-lg">
                    {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    Simpan {totalPending} Produk Terjual
                </Button>
            </div>
        </div>
      )}
    </div>
  );
}
