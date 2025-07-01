
"use client";

import { useState, useEffect } from "react";
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
import { Minus, Plus, Loader2, Save, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/context/SessionContext";
import { cn } from "@/lib/utils";
import { ImagePreviewDialog } from "./image-preview-dialog";
import { useBrowserNotifications } from "@/hooks/use-browser-notifications";

const categories = ["Semua", "Creampuff", "Cheesecake", "Millecrepes", "Minuman", "Snackbox", "Lainnya"];

export function UpdateClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [pendingChanges, setPendingChanges] = useState<Map<string, number>>(new Map());
  const { toast } = useToast();
  const { sessionEstablished, sessionInfo } = useSession();
  const [showReminder, setShowReminder] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const { sendNotification } = useBrowserNotifications();

  useEffect(() => {
    if (sessionEstablished) {
      const showTimer = setTimeout(() => setShowReminder(true), 500);
      return () => clearTimeout(showTimer);
    }
  }, [sessionEstablished]);

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

  const handleSave = async (product: Product) => {
    const quantity = pendingChanges.get(product.id);
    if (!quantity || quantity <= 0) {
        toast({ title: "Tidak Ada Perubahan", description: "Tidak ada produk yang terjual untuk disimpan." });
        return;
    }
    if (!sessionInfo) {
        toast({ variant: "destructive", title: "Sesi Tidak Ditemukan", description: "Tidak dapat menyimpan karena informasi sesi tidak ada." });
        return;
    }

    setSavingProductId(product.id);
    try {
        const batch = writeBatch(db);
        const newStock = product.stock - quantity;
        
        const productRef = doc(db, "products", product.id);
        batch.update(productRef, { stock: newStock });
        
        const historyItem: SaleHistoryItem = {
            productId: product.id,
            productName: product.name,
            quantity: quantity,
            image: product.image
        };
        
        const historyRef = doc(collection(db, "sales_history"));
        batch.set(historyRef, {
            timestamp: serverTimestamp(),
            session: sessionInfo,
            items: [historyItem],
            totalItems: quantity,
        });

        await batch.commit();

        toast({
            title: "Sukses!",
            description: `Berhasil menyimpan penjualan ${quantity} ${product.name}.`
        });
        
        const newChanges = new Map(pendingChanges);
        newChanges.delete(product.id);
        setPendingChanges(newChanges);

        if (newStock === 0) {
            sendNotification('Stok Habis', { body: `Produk "${product.name}" telah habis.` });
        }

    } catch (error) {
        console.error("Error saving sales: ", error);
        toast({
            variant: "destructive",
            title: "Gagal Menyimpan",
            description: "Terjadi kesalahan saat menyimpan transaksi.",
        });
    } finally {
        setSavingProductId(null);
    }
  };

  const filteredProducts = products.filter(product => 
    selectedCategory === "Semua" || product.category === selectedCategory
  );

  return (
    <>
    <div className="flex flex-col">
      <div
        className={cn(
          "fixed top-24 right-0 md:right-4 z-50 w-full max-w-xs rounded-l-lg md:rounded-lg border bg-card p-4 shadow-lg text-card-foreground transition-transform duration-500 ease-in-out font-headline",
          "transform translate-x-[calc(100%+2rem)]",
          showReminder && "translate-x-0"
        )}
        role="alert"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                  <p className="text-sm font-semibold">Pengingat! 😉</p>
                  <p className="text-xs font-normal text-muted-foreground mt-1">
                      {sessionInfo?.name && <span>Halo {sessionInfo.name}, </span>}
                      Jangan lupa kalo sudah closing, reset produk di menu 'Produk' supaya stok harian kamu tercatat dengan rapi.
                  </p>
              </div>
          </div>
          <Button onClick={() => setShowReminder(false)} className="w-full">
            Paham
          </Button>
        </div>
      </div>

      <div className="flex-none border-b bg-background p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight font-headline">Catat Produk Yang Sudah Terjual</h1>
                <p className="text-muted-foreground font-serif">Kurangi stok untuk setiap produk yang laku terjual, lalu simpan.</p>
            </div>
        </div>
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

      <div className="flex-1 p-4 md:p-8">
        {loading ? (
           <div className="flex h-full w-full items-center justify-center">
             <Loader2 className="h-8 w-8 animate-spin text-primary" />
           </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="transition-transform duration-200 ease-in-out hover:scale-105 active:scale-105 flex flex-col overflow-hidden">
                <CardHeader className="p-0">
                  <button
                    onClick={() => setPreviewImageUrl(product.image)}
                    className="relative aspect-square w-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-t-lg overflow-hidden"
                    aria-label={`Lihat gambar ${product.name}`}
                  >
                    <Image src={product.image || 'https://placehold.co/600x400.png'} alt={product.name} fill className="object-cover" data-ai-hint="pastry dreampuff"/>
                  </button>
                </CardHeader>
                <CardContent className="flex-1 p-2">
                  <CardTitle className="text-sm leading-tight mb-1 truncate">{product.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">Stok: <span className="font-bold text-foreground">{product.stock}</span></p>
                </CardContent>
                <CardFooter className="flex flex-col items-stretch gap-2 p-2 pt-0">
                    <div className="flex justify-center items-center gap-2">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleQuantityChange(product, -1)} disabled={!!savingProductId || (pendingChanges.get(product.id) || 0) <= 0}>
                            <Minus className="h-4 w-4" />
                        </Button>
                        <div className="text-lg font-bold w-8 text-center">
                            {pendingChanges.get(product.id) || 0}
                        </div>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleQuantityChange(product, 1)} disabled={!!savingProductId || product.stock <= (pendingChanges.get(product.id) || 0)}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button 
                      size="sm" 
                      className="h-8"
                      onClick={() => handleSave(product)} 
                      disabled={!!savingProductId || !pendingChanges.get(product.id)}
                    >
                      {savingProductId === product.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Simpan
                    </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center h-full">
            <p className="text-lg font-semibold">Tidak Ada Produk</p>
            <p className="text-muted-foreground font-serif">Tidak ada produk yang ditemukan dalam kategori '{selectedCategory}'.</p>
          </div>
        )}
      </div>
    </div>
    <ImagePreviewDialog imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />
    </>
  );
}
