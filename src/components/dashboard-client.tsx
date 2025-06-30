"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus, Package, Boxes, ShieldCheck, AlertTriangle, XCircle, TrendingUp, Loader2 } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const seedProducts: Omit<Product, "id">[] = [
  { name: "Puff Cokelat", stock: 50, image: "https://placehold.co/600x400.png" },
  { name: "Puff Keju", stock: 35, image: "https://placehold.co/600x400.png" },
  { name: "Puff Vanila", stock: 42, image: "https://placehold.co/600x400.png" },
  { name: "Donat Gula", stock: 60, image: "https://placehold.co/600x400.png" },
];

const updateStockSchema = z.object({
  amount: z.coerce.number().int().min(1, { message: "Jumlah minimal 1" }),
});
type UpdateStockForm = z.infer<typeof updateStockSchema>;

export function DashboardClient() {
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
    setLoading(true);
    // Menggunakan data lokal untuk debugging, bukan Firestore
    const initialProducts: Product[] = seedProducts.map((p, index) => ({
      ...p,
      id: `product-${index + 1}`,
    }));
    // Simulasi penundaan jaringan
    setTimeout(() => {
      setProducts(initialProducts);
      setLoading(false);
    }, 500);
  }, []);

  const openUpdateDialog = (product: Product, action: "add" | "subtract") => {
    setSelectedProduct(product);
    setUpdateAction(action);
    resetUpdate({ amount: 1 });
    setIsUpdateStockDialogOpen(true);
  };

  const handleUpdateStock: SubmitHandler<UpdateStockForm> = (data) => {
    if (!selectedProduct) return;

    const amount = data.amount;

    setProducts(prevProducts =>
      prevProducts.map(p => {
        if (p.id === selectedProduct.id) {
          const newStock = updateAction === 'add' ? p.stock + amount : p.stock - amount;
          if (newStock < 0) {
            toast({
              variant: "destructive",
              title: "Gagal Memperbarui Stok",
              description: "Stok tidak boleh kurang dari nol.",
            });
            return p;
          }
          return { ...p, stock: newStock };
        }
        return p;
      })
    );
    
    toast({
      title: "Sukses",
      description: `Stok untuk ${selectedProduct.name} telah diperbarui (lokal).`,
    });

    resetUpdate();
    setIsUpdateStockDialogOpen(false);
    setSelectedProduct(null);
  };

  const totalProducts = products.length;
  const totalStock = products.reduce((sum, product) => sum + product.stock, 0);
  const sufficientStockProducts = products.filter(p => p.stock > 10).length;
  const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= 10).length;
  const outOfStockProducts = products.filter(p => p.stock === 0).length;
  const highestStockProduct = products.reduce(
    (max, p) => (p.stock > max.stock ? p : max),
    products.length > 0 ? products[0] : { name: "N/A", stock: 0 }
  );
  
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-200px)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dasbor Stok Produk</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">jenis produk berbeda</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stok</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStock}</div>
            <p className="text-xs text-muted-foreground">item di semua produk</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Cukup</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sufficientStockProducts}</div>
            <p className="text-xs text-muted-foreground">produk dengan stok &gt; 10</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Sedikit</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockProducts}</div>
            <p className="text-xs text-muted-foreground">produk akan segera habis</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Habis</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outOfStockProducts}</div>
            <p className="text-xs text-muted-foreground">produk tidak tersedia</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Tertinggi</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highestStockProduct.stock}</div>
            <p className="text-xs text-muted-foreground" title={highestStockProduct.name}>
              {highestStockProduct.name.length > 20 ? `${highestStockProduct.name.substring(0, 18)}...` : highestStockProduct.name}
            </p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold tracking-tight mb-4">Detail Produk</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <Card key={product.id}>
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
