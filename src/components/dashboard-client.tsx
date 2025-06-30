"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Minus, Plus, Package, Boxes, ShieldCheck, AlertTriangle, XCircle, TrendingUp } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const initialProducts: Product[] = [
  { id: "prod1", name: "Puff Cokelat", stock: 50, image: "https://placehold.co/600x400.png" },
  { id: "prod2", name: "Puff Keju", stock: 35, image: "https://placehold.co/600x400.png" },
  { id: "prod3", name: "Puff Vanila", stock: 42, image: "https://placehold.co/600x400.png" },
  { id: "prod4", name: "Donat Gula", stock: 60, image: "https://placehold.co/600x400.png" },
];

const newProductSchema = z.object({
  name: z.string().min(3, { message: "Nama produk minimal 3 karakter" }),
  stock: z.coerce.number().int().min(0, { message: "Stok tidak boleh kurang dari 0" }),
});
type NewProductForm = z.infer<typeof newProductSchema>;

const updateStockSchema = z.object({
  amount: z.coerce.number().int().min(1, { message: "Jumlah minimal 1" }),
});
type UpdateStockForm = z.infer<typeof updateStockSchema>;

export function DashboardClient() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false);
  const [isUpdateStockDialogOpen, setIsUpdateStockDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [updateAction, setUpdateAction] = useState<"add" | "subtract">("add");

  const {
    register: registerNew,
    handleSubmit: handleSubmitNew,
    formState: { errors: errorsNew },
    reset: resetNew,
  } = useForm<NewProductForm>({ resolver: zodResolver(newProductSchema) });

  const {
    register: registerUpdate,
    handleSubmit: handleSubmitUpdate,
    formState: { errors: errorsUpdate },
    reset: resetUpdate,
  } = useForm<UpdateStockForm>({ resolver: zodResolver(updateStockSchema) });

  const handleAddNewProduct: SubmitHandler<NewProductForm> = (data) => {
    const newProduct: Product = {
      id: `prod${Date.now()}`,
      name: data.name,
      stock: data.stock,
      image: "https://placehold.co/600x400.png",
    };
    setProducts([...products, newProduct]);
    resetNew();
    setIsNewProductDialogOpen(false);
  };

  const openUpdateDialog = (product: Product, action: "add" | "subtract") => {
    setSelectedProduct(product);
    setUpdateAction(action);
    setIsUpdateStockDialogOpen(true);
  };

  const handleUpdateStock: SubmitHandler<UpdateStockForm> = (data) => {
    if (!selectedProduct) return;

    setProducts(products.map(p => {
      if (p.id === selectedProduct.id) {
        const newStock = updateAction === 'add' ? p.stock + data.amount : p.stock - data.amount;
        return { ...p, stock: Math.max(0, newStock) };
      }
      return p;
    }));
    
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
  
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dasbor Stok Produk</h1>
        <Dialog open={isNewProductDialogOpen} onOpenChange={setIsNewProductDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Tambah Produk Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Tambah Produk Baru</DialogTitle>
              <DialogDescription>
                Masukkan detail produk baru untuk menambahkannya ke stok.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitNew(handleAddNewProduct)} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nama</Label>
                <Input id="name" {...registerNew("name")} className="col-span-3" />
                {errorsNew.name && <p className="col-span-4 text-right text-sm text-destructive">{errorsNew.name.message}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stock" className="text-right">Stok Awal</Label>
                <Input id="stock" type="number" {...registerNew("stock")} className="col-span-3" />
                {errorsNew.stock && <p className="col-span-4 text-right text-sm text-destructive">{errorsNew.stock.message}</p>}
              </div>
              <DialogFooter>
                <Button type="submit">Tambah Produk</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
