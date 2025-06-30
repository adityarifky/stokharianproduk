
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
  writeBatch,
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus, Loader2 } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const seedProducts: Omit<Product, "id">[] = [
  { name: "Puff Cokelat", stock: 50, image: "https://placehold.co/600x400.png", category: "Creampuff" },
  { name: "Puff Keju", stock: 35, image: "https://placehold.co/600x400.png", category: "Creampuff" },
  { name: "Red Velvet Cheesecake", stock: 20, image: "https://placehold.co/600x400.png", category: "Cheesecake" },
  { name: "Chocolate Millecrepes", stock: 15, image: "https://placehold.co/600x400.png", category: "Millecrepes" },
  { name: "Kopi Gula Aren", stock: 40, image: "https://placehold.co/600x400.png", category: "Minuman" },
  { name: "Paket Snackbox A", stock: 10, image: "https://placehold.co/600x400.png", category: "Snackbox" },
  { name: "Donat Gula", stock: 60, image: "https://placehold.co/600x400.png", category: "Lainnya" },
];

const updateStockSchema = z.object({
  amount: z.coerce.number().int().min(1, { message: "Jumlah minimal 1" }),
});
type UpdateStockForm = z.infer<typeof updateStockSchema>;

export function UpdateClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdateStockDialogOpen, setIsUpdateStockDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [updateAction, setUpdateAction] = useState<"add" | "subtract">("add");
  const { toast } = useToast();

  const {
    register: registerUpdate,
    handleSubmit: handleSubmitUpdate,
    formState: { errors: errorsUpdate },
    reset: resetUpdate,
  } = useForm<UpdateStockForm>({ resolver: zodResolver(updateStockSchema) });

  useEffect(() => {
    const q = query(collection(db, "products"));

    const seedDatabase = async () => {
      const batch = writeBatch(db);
      seedProducts.forEach((productData) => {
        const docRef = doc(collection(db, "products"));
        batch.set(docRef, productData);
      });
      await batch.commit();
    };

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      if (querySnapshot.empty) {
        setLoading(true);
        await seedDatabase();
      } else {
        const productData: Product[] = [];
        querySnapshot.forEach((doc) => {
          productData.push({ id: doc.id, ...doc.data() } as Product);
        });
        setProducts(productData);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching products: ", error);
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Gagal Memuat Data",
        description: "Tidak dapat terhubung ke database. Coba muat ulang halaman.",
      });
    });

    return () => unsubscribe();
  }, [toast]);

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
  
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-200px)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <p className="text-muted-foreground -mt-2 md:-mt-4 mb-4">Catat semua perubahan produk secara realtime.</p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <Card key={product.id} className="transition-transform duration-200 ease-in-out hover:scale-105 active:scale-105">
            <CardHeader>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
                <Image src={product.image} alt={product.name} fill className="object-cover" data-ai-hint="pastry dreampuff"/>
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-lg">{product.name}</CardTitle>
              <p className="text-muted-foreground">Stok saat ini: <span className="font-bold text-foreground">{product.stock}</span></p>
            </CardContent>
            <CardFooter className="flex justify-between gap-2">
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
    </>
  );
}
