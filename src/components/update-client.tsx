
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
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Minus, Plus, Loader2 } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/context/SessionContext";

const updateStockSchema = z.object({
  amount: z.coerce.number().int().min(1, { message: "Jumlah minimal 1" }),
});
type UpdateStockForm = z.infer<typeof updateStockSchema>;

const categories = ["Semua", "Creampuff", "Cheesecake", "Millecrepes", "Minuman", "Snackbox", "Lainnya"];

export function UpdateClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdateStockDialogOpen, setIsUpdateStockDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [updateAction, setUpdateAction] = useState<"add" | "subtract">("add");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const { toast } = useToast();
  const { sessionEstablished } = useSession();

  const {
    register: registerUpdate,
    handleSubmit: handleSubmitUpdate,
    formState: { errors: errorsUpdate },
    reset: resetUpdate,
  } = useForm<UpdateStockForm>({ resolver: zodResolver(updateStockSchema) });

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

  const openUpdateDialog = (product: Product, action: "add" | "subtract") => {
    setSelectedProduct(product);
    setUpdateAction(action);
    resetUpdate({ amount: 1 });
    setIsUpdateStockDialogOpen(true);
  };

  const handleUpdateStock: SubmitHandler<UpdateStockForm> = async (data) => {
    if (!selectedProduct) return;

    const amount = data.amount;
    const newStock = updateAction === 'add' ? selectedProduct.stock + amount : selectedProduct.stock - amount;

    if (newStock < 0) {
      toast({
        variant: "destructive",
        title: "Gagal Memperbarui Stok",
        description: "Stok tidak boleh kurang dari nol.",
      });
      return;
    }

    try {
      const productRef = doc(db, "products", selectedProduct.id);
      await updateDoc(productRef, { stock: newStock });
      
      toast({
        title: "Sukses",
        description: `Stok untuk ${selectedProduct.name} telah diperbarui.`,
      });

      resetUpdate();
      setIsUpdateStockDialogOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error("Error updating stock: ", error);
      toast({
        variant: "destructive",
        title: "Gagal Memperbarui Stok",
        description: "Terjadi kesalahan saat menyimpan ke database.",
      });
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
                <CardContent className="flex-1 p-4">
                  <CardTitle className="text-lg leading-tight mb-1">{product.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">Stok saat ini: <span className="font-bold text-foreground">{product.stock}</span></p>
                </CardContent>
                <CardFooter className="flex justify-between gap-2 p-4 pt-0">
                  <Button variant="outline" className="w-full" onClick={() => openUpdateDialog(product, "subtract")}>
                    <Minus className="mr-2 h-4 w-4" />
                    Kurangi
                  </Button>
                  <Button className="w-full" onClick={() => openUpdateDialog(product, "add")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah
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

      <Dialog open={isUpdateStockDialogOpen} onOpenChange={setIsUpdateStockDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{updateAction === 'add' ? 'Tambah Stok' : 'Kurangi Stok'}: {selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              Masukkan jumlah untuk {updateAction === 'add' ? 'ditambahkan ke' : 'dikurangi dari'} stok.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitUpdate(handleUpdateStock)} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">Jumlah</Label>
              <Input id="amount" type="number" {...registerUpdate("amount")} className="col-span-3" />
              {errorsUpdate.amount && <p className="col-span-4 text-right text-sm text-destructive">{errorsUpdate.amount.message}</p>}
            </div>
            <DialogFooter>
              <Button type="submit">{updateAction === 'add' ? 'Tambah Stok' : 'Kurangi Stok'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
