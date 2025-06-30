
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { collection, query, onSnapshot, doc, deleteDoc, updateDoc, writeBatch, setDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Loader2, Trash2, Plus, RotateCcw, Camera } from "lucide-react";

import { db, storage } from "@/lib/firebase";
import type { Product } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";


const addProductSchema = z.object({
  name: z.string().min(1, { message: "Nama produk harus diisi." }),
  category: z.enum(["Creampuff", "Cheesecake", "Millecrepes", "Minuman", "Snackbox", "Lainnya"], {
    required_error: "Kategori harus dipilih.",
  }),
});

const updateStockSchema = z.object({
    productId: z.string({ required_error: "Produk harus dipilih." }).min(1, { message: "Produk harus dipilih." }),
    stock: z.coerce.number().int().min(0, { message: "Stok minimal 0." }),
});

const categories = ["Creampuff", "Cheesecake", "Millecrepes", "Minuman", "Snackbox", "Lainnya"];

export function ProdukClient() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const addForm = useForm<z.infer<typeof addProductSchema>>({
    resolver: zodResolver(addProductSchema),
    defaultValues: {
      name: "",
      category: undefined,
    },
  });

  const updateForm = useForm<z.infer<typeof updateStockSchema>>({
    resolver: zodResolver(updateStockSchema),
    defaultValues: {
      productId: "",
      stock: 0,
    },
  });

  useEffect(() => {
    setLoadingProducts(true);
    const q = query(collection(db, "products"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const productsData: Product[] = [];
      querySnapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(productsData.sort((a, b) => a.name.localeCompare(b.name)));
      setLoadingProducts(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      toast({
        variant: "destructive",
        title: "Gagal memuat data",
        description: "Tidak dapat mengambil daftar produk dari database.",
      });
      setLoadingProducts(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };
  
  const onAddSubmit = async (values: z.infer<typeof addProductSchema>) => {
    setIsLoading(true);
    try {
      let imageUrl = "https://placehold.co/600x400.png";
      const newProductRef = doc(collection(db, "products"));

      if (selectedFile) {
        const imageRef = storageRef(storage, `product-images/${newProductRef.id}`);
        await uploadBytes(imageRef, selectedFile);
        imageUrl = await getDownloadURL(imageRef);
      }

      await setDoc(newProductRef, {
        ...values,
        stock: 0,
        image: imageUrl,
      });

      toast({
        title: "Sukses!",
        description: `Produk "${values.name}" berhasil ditambahkan.`,
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error adding product: ", error);
      toast({
        variant: "destructive",
        title: "Gagal Menambahkan Produk",
        description: "Terjadi kesalahan saat menyimpan ke database.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onUpdateStockSubmit = async (values: z.infer<typeof updateStockSchema>) => {
    setIsLoading(true);
    try {
        const productRef = doc(db, "products", values.productId);
        await updateDoc(productRef, { stock: values.stock });

        const updatedProduct = products.find(p => p.id === values.productId);
        toast({
            title: "Sukses!",
            description: `Stok untuk "${updatedProduct?.name}" berhasil diupdate.`,
        });
        updateForm.reset({ productId: "", stock: 0 });
    } catch (error) {
        console.error("Error updating stock: ", error);
        toast({
            variant: "destructive",
            title: "Gagal Mengupdate Stok",
            description: "Terjadi kesalahan saat menyimpan ke database.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  const handleResetAllStock = async () => {
    setIsLoading(true);
    try {
      const batch = writeBatch(db);
      products.forEach((product) => {
        const productRef = doc(db, "products", product.id);
        batch.update(productRef, { stock: 0 });
      });
      await batch.commit();

      toast({
        title: "Sukses!",
        description: "Semua stok produk berhasil di-reset ke 0.",
      });
    } catch (error) {
      console.error("Error resetting all stock: ", error);
      toast({
        variant: "destructive",
        title: "Gagal Mereset Stok",
        description: "Terjadi kesalahan saat berkomunikasi dengan database.",
      });
    } finally {
      setIsResetDialogOpen(false);
      setIsLoading(false);
    }
  };

  const openDeleteDialog = (id: string) => {
    setProductToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await deleteDoc(doc(db, "products", productToDelete));
      toast({
        title: "Sukses!",
        description: "Produk telah berhasil dihapus."
      });
    } catch (error) {
      console.error("Error deleting product: ", error);
      toast({
        variant: "destructive",
        title: "Gagal Menghapus Produk",
        description: "Terjadi kesalahan saat menghapus dari database.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  return (
    <div className="grid gap-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Update Stok Awal Produk</CardTitle>
              <CardDescription>
                Gunakan formulir ini untuk mengatur ulang jumlah stok produk yang sudah ada.
              </CardDescription>
            </div>
            <Button variant="destructive" onClick={() => setIsResetDialogOpen(true)} disabled={isLoading}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Semua Stok
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...updateForm}>
            <form onSubmit={updateForm.handleSubmit(onUpdateStockSubmit)} className="space-y-6">
              <FormField
                control={updateForm.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Produk</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih produk untuk diupdate" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateForm.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jumlah Stok Baru</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="cth. 50" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mengupdate...
                  </>
                ) : (
                  "Update Stok"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Daftar Produk</CardTitle>
              <CardDescription>Kelola semua produk yang terdaftar di dalam stok.</CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Produk Baru
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingProducts ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Produk</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-center w-[100px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell className="text-right">{product.stock}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => openDeleteDialog(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Hapus</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) {
          addForm.reset({ name: "", category: undefined });
          setSelectedFile(null);
          setImagePreview(null);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Tambah Produk Baru</DialogTitle>
            <DialogDescription>
              Gunakan formulir ini untuk menambah jenis produk baru. Stok awal akan otomatis diatur ke 0.
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4 py-4">
              <div className="space-y-2 flex flex-col items-center">
                <Label>Gambar Produk</Label>
                <div className="w-32 h-32 rounded-lg border border-dashed flex items-center justify-center bg-muted/40">
                  {imagePreview ? (
                    <Image src={imagePreview} alt="Pratinjau" width={128} height={128} className="object-cover rounded-md h-full w-full" />
                  ) : (
                    <span className="text-xs text-muted-foreground text-center p-2">Pratinjau Gambar</span>
                  )}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                  <Camera className="mr-2 h-4 w-4" />
                  Pilih Gambar
                </Button>
                <Input 
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/png, image/jpeg"
                  onChange={handleFileChange}
                  disabled={isLoading}
                />
              </div>

              <FormField
                control={addForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Produk</FormLabel>
                    <FormControl>
                      <Input placeholder="cth. Puff Cokelat" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih kategori produk" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isLoading}>Batal</Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Tambah Produk"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Produk akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteProduct}
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Semua Stok Produk?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan mengatur ulang stok SEMUA produk menjadi 0. Ini biasanya dilakukan setelah tutup toko harian. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleResetAllStock}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Ya, Reset"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
