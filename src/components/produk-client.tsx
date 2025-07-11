
"use client";

import 'react-image-crop/dist/ReactCrop.css';
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { collection, query, onSnapshot, doc, deleteDoc, updateDoc, writeBatch, setDoc, getDocs, where, serverTimestamp, orderBy, limit } from "firebase/firestore";
import { Loader2, Trash2, Plus, RotateCcw, Camera, Pencil, ChefHat } from "lucide-react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';

import { db } from "@/lib/firebase";
import type { Product, ReportItem, SaleHistory } from "@/lib/types";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useSession } from '@/context/SessionContext';
import { ImagePreviewDialog } from './image-preview-dialog';
import { cn } from '@/lib/utils';
import { useBrowserNotifications } from '@/hooks/use-browser-notifications';

const addProductSchema = z.object({
  name: z.string().min(1, { message: "Nama produk harus diisi." }),
  category: z.enum(["Creampuff", "Cheesecake", "Millecrepes", "Minuman", "Snackbox", "Lainnya"], {
    required_error: "Kategori harus dipilih.",
  }),
});

const editProductSchema = z.object({
  name: z.string().min(1, { message: "Nama produk harus diisi." }),
});

const updateStockSchema = z.object({
    productId: z.string({ required_error: "Produk harus dipilih." }).min(1, { message: "Produk harus dipilih." }),
    stock: z.coerce.number().int().min(0, { message: "Stok minimal 0." }),
});

const categories = ["Creampuff", "Cheesecake", "Millecrepes", "Minuman", "Snackbox", "Lainnya"];

// Helper to convert file to Data URI
const fileToDataUri = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

// Helper for centering the crop
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export function ProdukClient() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const { sessionEstablished, sessionInfo } = useSession();
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [showKitchenReminder, setShowKitchenReminder] = useState(false);
  const { sendNotification } = useBrowserNotifications();
  const [updateCategory, setUpdateCategory] = useState<string>('Semua');
  
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [isImageMarkedForDeletion, setIsImageMarkedForDeletion] = useState(false);
  const aspect = 1; // Square crop

  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addForm = useForm<z.infer<typeof addProductSchema>>({
    resolver: zodResolver(addProductSchema),
    defaultValues: {
      name: "",
      category: undefined,
    },
  });

  const editForm = useForm<z.infer<typeof editProductSchema>>({
    resolver: zodResolver(editProductSchema),
    defaultValues: {
      name: "",
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
    if (!sessionEstablished) {
      setLoadingProducts(false);
      return;
    }

    setLoadingProducts(true);
    const q = query(collection(db, "products"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const productsData: Product[] = [];
      querySnapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(productsData.sort((a, b) => a.name.localeCompare(b.name)));
      setLoadingProducts(false);
    }, (error: any) => {
      console.error("Firestore listener error:", error);
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
            description: `Gagal mengambil produk. Error: ${error.code}`,
        });
      }
      setLoadingProducts(false);
    });

    return () => {
      unsubscribe();
    }
  }, [toast, sessionEstablished]);
  
  useEffect(() => {
    if (sessionEstablished) {
        const timer = setTimeout(() => setShowKitchenReminder(true), 500);
        return () => clearTimeout(timer);
    }
  }, [sessionEstablished]);
  
  async function getCroppedImg(
    image: HTMLImageElement,
    crop: PixelCrop
  ): Promise<string> {
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext("2d");
  
    if (!ctx) {
      throw new Error("No 2d context");
    }
  
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );
  
    return new Promise((resolve) => {
      resolve(canvas.toDataURL("image/jpeg"));
    });
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) { // 1MB limit for Data URI
        toast({
          variant: "destructive",
          title: "Ukuran Gambar Terlalu Besar",
          description: "Ukuran gambar maksimal adalah 1MB.",
        });
        return;
      }
      setCrop(undefined); // Clear crop when new image is selected
      try {
        const dataUri = await fileToDataUri(file);
        setSourceImage(dataUri);
        setIsImageMarkedForDeletion(false);
      } catch (error) {
        console.error("Error converting file to Data URI:", error);
        toast({
          variant: "destructive",
          title: "Gagal Membaca File",
          description: "Tidak dapat memproses file gambar yang dipilih.",
        });
      }
    }
  };

  const handleRemoveImage = () => {
    setSourceImage(null);
    setCompletedCrop(null);
    setCrop(undefined);
    setIsImageMarkedForDeletion(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspect));
  }

  const onAddSubmit = async (values: z.infer<typeof addProductSchema>) => {
    setIsLoading(true);
    try {
      let imageUrl = "https://placehold.co/600x400.png";
      
      if (sourceImage && !isImageMarkedForDeletion) {
        if (completedCrop && imgRef.current) {
          imageUrl = await getCroppedImg(imgRef.current, completedCrop);
        } else {
          imageUrl = sourceImage;
        }
      }

      const newProductRef = doc(collection(db, "products"));
      const newProductData = {
        id: newProductRef.id,
        name: values.name,
        category: values.category,
        stock: 0,
        image: imageUrl,
      };

      await setDoc(newProductRef, newProductData);
      
      toast({
        title: "Sukses!",
        description: `Produk "${values.name}" berhasil ditambahkan.`,
      });
      setIsAddDialogOpen(false);
    } catch (error: any) {
      console.error("Add product operation failed:", error);
      toast({
        variant: "destructive",
        title: "Gagal Menambahkan Produk",
        description: `Terjadi kesalahan saat menyimpan: ${error.code || error.message}.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onEditSubmit = async (values: z.infer<typeof editProductSchema>) => {
    if (!productToEdit) return;
    setIsLoading(true);
    try {
      const productRef = doc(db, "products", productToEdit.id);
      const updates: { name: string; image?: string } = { name: values.name };

      if (sourceImage && !isImageMarkedForDeletion) {
        if (completedCrop && imgRef.current) {
          updates.image = await getCroppedImg(imgRef.current, completedCrop);
        } else if (sourceImage !== productToEdit.image) {
          updates.image = sourceImage;
        }
      } else if (isImageMarkedForDeletion) {
        updates.image = "https://placehold.co/600x400.png";
      }
      
      await updateDoc(productRef, updates);
      
      toast({
        title: "Sukses!",
        description: `Produk "${values.name}" berhasil diupdate.`,
      });
      setIsEditDialogOpen(false);
    } catch (error: any)
    {
      console.error("Edit product operation failed:", error);
      toast({
        variant: "destructive",
        title: "Gagal Mengupdate Produk",
        description: `Terjadi kesalahan saat menyimpan: ${error.code || error.message}.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onUpdateStockSubmit = async (values: z.infer<typeof updateStockSchema>) => {
      setIsLoading(true);
      if (!sessionInfo) {
          toast({ variant: "destructive", title: "Sesi tidak valid", description: "Harap mulai sesi kerja baru untuk melanjutkan." });
          setIsLoading(false);
          return;
      }
  
      try {
          const productToUpdate = products.find(p => p.id === values.productId);
          if (!productToUpdate) {
              toast({ variant: "destructive", title: "Produk tidak ditemukan." });
              setIsLoading(false);
              return;
          }
  
          const oldStock = productToUpdate.stock;
          const newStock = values.stock;
          const quantityAdded = newStock - oldStock;
  
          const batch = writeBatch(db);
  
          const productRef = doc(db, "products", values.productId);
          batch.update(productRef, { stock: newStock });
  
          if (quantityAdded > 0) {
              const stockHistoryRef = doc(collection(db, "stock_history"));
              batch.set(stockHistoryRef, {
                  timestamp: serverTimestamp(),
                  session: sessionInfo,
                  product: {
                      id: productToUpdate.id,
                      name: productToUpdate.name,
                      image: productToUpdate.image,
                  },
                  quantityAdded: quantityAdded,
                  stockAfter: newStock,
              });
          }
          
          await batch.commit();

          if (newStock === 0 && oldStock > 0) {
            sendNotification('Stok Habis', { body: `Stok untuk "${productToUpdate.name}" telah diatur menjadi 0.` });
          }
  
          toast({
              title: "Sukses!",
              description: `Stok untuk "${productToUpdate.name}" berhasil diupdate.`,
          });
          updateForm.reset({ productId: "", stock: 0 });
      } catch (error: any) {
          console.error("Error updating stock: ", error);
          toast({
              variant: "destructive",
              title: "Gagal Mengupdate Stok",
              description: `Terjadi kesalahan saat menyimpan: ${error.code || error.message}`,
          });
      } finally {
          setIsLoading(false);
      }
  };

  const handleResetAllStock = async () => {
    setIsLoading(true);

    if (!sessionInfo) {
      toast({
        variant: "destructive",
        title: "Sesi Tidak Ditemukan",
        description: "Tidak dapat membuat laporan karena informasi sesi tidak ada.",
      });
      setIsLoading(false);
      setIsResetDialogOpen(false);
      return;
    }

    try {
      const batch = writeBatch(db);

      // 1. Fetch all current products to get their final stock
      const productsCollection = collection(db, "products");
      const productsSnapshot = await getDocs(productsCollection);
      const currentProducts: Product[] = [];
      productsSnapshot.forEach(doc => {
        currentProducts.push({ id: doc.id, ...doc.data() } as Product);
      });

      // 2. Prepare the list of "rejected" items (remaining stock)
      const itemsRejected: ReportItem[] = currentProducts
        .filter(p => p.stock > 0)
        .map(p => ({
          productName: p.name,
          category: p.category,
          quantity: p.stock,
          image: p.image,
        }));
      const totalRejected = itemsRejected.reduce((sum, item) => sum + item.quantity, 0);

      // 3. Get the timestamp of the last report to avoid double-counting sales
      const reportsCollection = collection(db, "daily_reports");
      const lastReportQuery = query(reportsCollection, orderBy("timestamp", "desc"), limit(1));
      const lastReportSnapshot = await getDocs(lastReportQuery);
      const lastReportTimestamp = lastReportSnapshot.empty 
        ? new Date(0) // If no reports, fetch all history from the beginning of time
        : lastReportSnapshot.docs[0].data().timestamp;

      // 4. Fetch sales that occurred after the last report was generated
      const salesQuery = query(
        collection(db, "sales_history"),
        where("timestamp", ">", lastReportTimestamp)
      );
      const salesSnapshot = await getDocs(salesQuery);

      // 5. Aggregate all sold items
      const soldItemsMap = new Map<string, ReportItem & { productId: string }>();
      salesSnapshot.docs.forEach(doc => {
        const sale = doc.data() as Omit<SaleHistory, 'id'>;
        sale.items.forEach(item => {
          const existing = soldItemsMap.get(item.productId);
          if (existing) {
            existing.quantity += item.quantity;
          } else {
            const productDetails = currentProducts.find(p => p.id === item.productId);
            soldItemsMap.set(item.productId, {
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              category: productDetails?.category || 'Lainnya',
              image: item.image,
            });
          }
        });
      });
      const itemsSold: ReportItem[] = Array.from(soldItemsMap.values()).map(({ productId, ...rest }) => rest);
      const totalSold = itemsSold.reduce((sum, item) => sum + item.quantity, 0);

      // 6. Create the report document in the batch
      if (itemsSold.length > 0 || itemsRejected.length > 0) {
        const reportRef = doc(reportsCollection);
        batch.set(reportRef, {
          timestamp: serverTimestamp(),
          session: sessionInfo,
          itemsSold,
          itemsRejected,
          totalSold,
          totalRejected,
        });
      }

      // 7. Add stock reset operations to the batch
      currentProducts.forEach((product) => {
        const productRef = doc(db, "products", product.id);
        batch.update(productRef, { stock: 0 });
      });
      
      // 8. Commit everything at once
      await batch.commit();

      toast({
        title: "Sukses!",
        description: "Laporan harian telah dibuat dan semua stok produk berhasil di-reset.",
      });

      sendNotification('Stok Direset', { body: 'Laporan harian berhasil dibuat dan semua stok produk telah di-reset ke 0.' });

    } catch (error: any) {
      console.error("Error generating report and resetting stock: ", error);
      toast({
        variant: "destructive",
        title: "Gagal Memproses",
        description: `Terjadi kesalahan: ${error.code || error.message}.`,
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

  const openEditDialog = (product: Product) => {
    setProductToEdit(product);
    editForm.reset({ name: product.name });
    setSourceImage(product.image);
    setCrop(undefined);
    setCompletedCrop(null);
    setIsImageMarkedForDeletion(false);
    setIsEditDialogOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    setIsLoading(true);
    try {
      await deleteDoc(doc(db, "products", productToDelete));
      toast({
        title: "Sukses!",
        description: "Produk telah berhasil dihapus."
      });
    } catch (error: any) {
      console.error("Error deleting product: ", error);
      toast({
        variant: "destructive",
        title: "Gagal Menghapus Produk",
        description: `Terjadi kesalahan saat menghapus: ${error.code || error.message}`,
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
      setIsLoading(false);
    }
  };

  const resetDialogState = () => {
    addForm.reset();
    editForm.reset();
    setSourceImage(null);
    setCrop(undefined);
    setCompletedCrop(null);
    setIsImageMarkedForDeletion(false);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  const filteredUpdateProducts = products.filter(p => updateCategory === 'Semua' || p.category === updateCategory);

  return (
    <>
    <div
        className={cn(
            "fixed top-24 right-0 md:right-4 z-50 w-full max-w-xs rounded-l-lg md:rounded-lg border bg-card p-4 shadow-lg text-card-foreground transition-transform duration-500 ease-in-out font-headline",
            "transform translate-x-[calc(100%+2rem)]",
            showKitchenReminder && "translate-x-0"
        )}
        role="alert"
      >
        <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
                <ChefHat className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                    <p className="text-sm font-semibold">
                        {sessionInfo?.name ? `Halo, ${sessionInfo.name}! 👋` : 'Informasi Penting'}
                    </p>
                    <p className="text-xs font-normal text-muted-foreground mt-1 font-serif">
                        Penambahan produk hanya bisa dilakukan oleh kitchen. Apakah Anda berposisi sebagai kitchen?
                    </p>
                </div>
            </div>
            <Button onClick={() => setShowKitchenReminder(false)} className="w-full">
                IYA
            </Button>
        </div>
    </div>
    <div className="flex flex-col">
       <div className="flex-none border-b bg-background p-4 md:p-6">
        <h1 className="text-2xl font-bold tracking-tight font-headline">Manajemen Produk</h1>
        <p className="text-muted-foreground font-serif">Kelola daftar produk dan atur stok secara manual di halaman ini.</p>
      </div>
      <div className="flex-1 p-4 md:p-8">
        <div className="grid gap-8">
          <Card>
            <CardHeader className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div>
                <CardTitle>Update Stok Produk / Reset</CardTitle>
                <CardDescription>
                  Formulir untuk menambah stok produk yang tersedia.
                </CardDescription>
              </div>
              <Button variant="destructive" onClick={() => setIsResetDialogOpen(true)} disabled={isLoading || products.length === 0}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Semua Stok
              </Button>
            </CardHeader>
            <CardContent>
              <Form {...updateForm}>
                <form onSubmit={updateForm.handleSubmit(onUpdateStockSubmit)} className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <FormItem>
                      <FormLabel>Filter Kategori</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          setUpdateCategory(value);
                          updateForm.setValue('productId', '', { shouldValidate: true });
                        }}
                        value={updateCategory}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Filter berdasarkan kategori" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Semua">Semua Kategori</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                    <FormField
                      control={updateForm.control}
                      name="productId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pilih Produk</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih produk untuk diupdate" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {filteredUpdateProducts.map((product) => (
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
                            <Input type="number" placeholder="0" {...field} disabled={isLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end">
                      <Button type="submit" disabled={isLoading}>
                          {isLoading ? (
                          <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Menyimpan...
                          </>
                          ) : (
                          "Update Stok"
                          )}
                      </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                  <CardTitle>Daftar Produk</CardTitle>
                  <CardDescription>Kelola semua produk yang terdaftar di dalam stok.</CardDescription>
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Produk
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
                      <TableHead className="w-[60px]">Gambar</TableHead>
                      <TableHead>Nama Produk</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Stok</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <button onClick={() => setPreviewImageUrl(product.image)} className="rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                            <Image
                              src={product.image}
                              alt={product.name}
                              width={40}
                              height={40}
                              className="rounded-md object-cover aspect-square"
                              data-ai-hint="product food"
                            />
                          </button>
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell className="text-right">{product.stock}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEditDialog(product)}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => openDeleteDialog(product.id)}
                              disabled={isLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Hapus</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) resetDialogState();
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
              <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-4">
                <div className="space-y-2 flex flex-col items-center">
                  <Label>Gambar Produk</Label>
                  {sourceImage ? (
                    <div className="flex flex-col items-center gap-2">
                      <ReactCrop
                        crop={crop}
                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={aspect}
                        minWidth={100}
                      >
                        <Image
                          ref={imgRef}
                          alt="Crop preview"
                          src={sourceImage}
                          onLoad={onImageLoad}
                          width={400}
                          height={400}
                          style={{ maxHeight: '70vh' }}
                        />
                      </ReactCrop>
                      <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                        <Camera className="mr-2 h-4 w-4" /> Ganti Gambar
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                      <Camera className="mr-2 h-4 w-4" /> Pilih Gambar
                    </Button>
                  )}
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
              </div>
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
      
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) resetDialogState();
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Produk</DialogTitle>
            <DialogDescription>
              Ubah nama atau gambar produk. Perubahan akan tersimpan secara permanen.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-4">
              <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-4">
                <div className="space-y-2 flex flex-col items-center">
                  <Label>Gambar Produk</Label>
                  {sourceImage && !isImageMarkedForDeletion ? (
                    <div className="flex flex-col items-center gap-2">
                      <ReactCrop
                        crop={crop}
                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={aspect}
                        minWidth={100}
                      >
                        <Image
                          ref={imgRef}
                          alt="Crop preview"
                          src={sourceImage}
                          onLoad={onImageLoad}
                          width={400}
                          height={400}
                          style={{ maxHeight: '70vh' }}
                          crossOrigin="anonymous" 
                        />
                      </ReactCrop>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-lg border border-dashed flex items-center justify-center bg-muted/40">
                      <span className="text-xs text-muted-foreground text-center p-2">Tidak ada gambar</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                        <Camera className="mr-2 h-4 w-4" />
                        Ubah
                      </Button>
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="sm" 
                        onClick={handleRemoveImage} 
                        disabled={isLoading || (!sourceImage || isImageMarkedForDeletion)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hapus
                      </Button>
                  </div>
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
                  control={editForm.control}
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isLoading}>Batal</Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Perubahan"
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
              disabled={isLoading}
            >
             {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Buat Laporan & Reset Stok?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan membuat laporan harian berdasarkan stok sisa dan penjualan sejak laporan terakhir, lalu me-reset SEMUA stok produk menjadi 0. Tindakan ini tidak dapat dibatalkan.
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
                "Ya, Buat & Reset"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    <ImagePreviewDialog imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />
    </>
  );
}
