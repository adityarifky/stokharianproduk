"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { collection, addDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

import { db } from "@/lib/firebase";
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      stock: 0,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      await addDoc(collection(db, "products"), {
        ...values,
        image: "https://placehold.co/600x400.png", // Default placeholder image
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

  return (
    <Card className="max-w-2xl mx-auto">
        <CardHeader>
            <CardTitle>Tambah Produk Baru</CardTitle>
            <CardDescription>Isi detail produk untuk menambahkannya ke dalam daftar stok.</CardDescription>
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
  );
}
