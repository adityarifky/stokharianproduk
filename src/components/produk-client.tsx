"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { collection, addDoc, query, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { Loader2, Trash2 } from "lucide-react";

import { db } from "@/lib/firebase";
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


const formSchema = z.object({
  name: z.string().min(1, { message: "Nama produk harus diisi." }),
  stock: z.coerce.number().int().min(0, { message: "Stok awal minimal 0." }),
  category: z.enum(["Creampuff", "Cheesecake", "Millecrepes", "Minuman", "Snackbox", "Lainnya"], {
    required_error: "Kategori harus dipilih.",
  }),
});

const categories = ["Creampuff", "Cheesecake", "Millecrepes", "Minuman", "Snackbox", "Lainnya"];

export function ProdukClient() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      await addDoc(collection(db, "products"), {
        ...values,
        image: "https://placehold.co/600x400.png",
      });

      toast({
        title: "Sukses!",
        description: `Produk "${values.name}" berhasil ditambahkan.`,
      });
      form.reset({ name: "", stock: 0, category: undefined });
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
    <>
      <div className="space-y-8">
        <Card>
          <CardHeader>
              <CardTitle>Tambah Produk Baru</CardTitle>
              <CardDescription>Gunakan formulir ini untuk menambah jenis produk baru dan memasukkan stok awalnya.</CardDescription>
          </CardHeader>
          <CardContent>
              <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                  control={form.control}
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
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Stok Awal</FormLabel>
                      <FormControl>
                          <Input type="number" placeholder="cth. 50" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
                  <FormField
                  control={form.control}
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
                  <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                      <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                      </>
                  ) : (
                      "Tambah Produk"
                  )}
                  </Button>
              </form>
              </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Produk Saat Ini</CardTitle>
            <CardDescription>Area ini menampilkan semua produk yang terdaftar di dalam stok.</CardDescription>
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
      </div>

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
    </>
  );
}
